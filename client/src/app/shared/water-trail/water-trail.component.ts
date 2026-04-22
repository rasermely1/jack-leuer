import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';

/**
 * Reusable water-ripple background.
 *
 * Runs a GPU ping-pong wave-equation simulation driven by pointer movement.
 * The simulation lives in two float render targets; a display shader reads
 * the heightfield gradient and outputs soft concentric ripples over a
 * transparent canvas so page content underneath remains fully readable.
 */
@Component({
  selector: 'app-water-trail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas class="water-trail__canvas"></canvas>`,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        display: block;
        overflow: hidden;
      }
      .water-trail__canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
    `,
  ],
})
export class WaterTrailComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  /** Toggle the effect on or off. When false, the loop is paused. */
  @Input() enabled = true;
  /** Overall strength of impulses added on pointer movement (0..1+). */
  @Input() intensity = 0.45;
  /** Per-step wave damping. Closer to 1 = longer-lived ripples. */
  @Input() damping = 0.965;
  /** Radius of each impulse splat, in cells of the 512-cell sim grid. */
  @Input() rippleSize = 14;
  /** Tint for ripple shading. Accepts any CSS color Three can parse. */
  @Input() color = '#2f2f2f';

  @HostBinding('attr.aria-hidden') readonly ariaHidden = 'true';

  private readonly abort = new AbortController();
  private rafId = 0;
  private running = false;
  private disposed = false;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private quad!: THREE.Mesh;

  private rtA!: THREE.WebGLRenderTarget;
  private rtB!: THREE.WebGLRenderTarget;

  private waveMaterial!: THREE.ShaderMaterial;
  private impulseMaterial!: THREE.ShaderMaterial;
  private displayMaterial!: THREE.ShaderMaterial;

  // Simulation grid stays fixed so perf is viewport-independent.
  private readonly simSize = 512;

  private readonly pointer = {
    uv: new THREE.Vector2(-1, -1),
    velocity: new THREE.Vector2(0, 0),
    /** Smoothed unit direction of travel; drives the wake orientation. */
    dir: new THREE.Vector2(1, 0),
    /** Low-pass filtered speed in UV/frame. */
    smoothedSpeed: 0,
    active: false,
    lastMoveTime: 0,
  };

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.init());
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.stop();
    this.abort.abort();
    this.dispose();
  }

  private init(): void {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry);
    this.scene.add(this.quad);

    const rtOptions: THREE.RenderTargetOptions = {
      type: this.pickFloatType(),
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.rtA = new THREE.WebGLRenderTarget(this.simSize, this.simSize, rtOptions);
    this.rtB = new THREE.WebGLRenderTarget(this.simSize, this.simSize, rtOptions);

    this.waveMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrev: { value: null },
        uTexel: { value: new THREE.Vector2(1 / this.simSize, 1 / this.simSize) },
        uDamping: { value: this.damping },
      },
      vertexShader: QUAD_VERT,
      fragmentShader: WAVE_FRAG,
    });

    this.impulseMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrev: { value: null },
        uPoint: { value: new THREE.Vector2(-1, -1) },
        uDir: { value: new THREE.Vector2(1, 0) },
        uHeadRadius: { value: 0.015 },
        uTailRadius: { value: 0.04 },
        uWakeLength: { value: 0.05 },
        uStrength: { value: 0 },
      },
      vertexShader: QUAD_VERT,
      fragmentShader: IMPULSE_FRAG,
      transparent: false,
    });

    this.displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uHeight: { value: null },
        uTexel: { value: new THREE.Vector2(1 / this.simSize, 1 / this.simSize) },
        uColor: { value: new THREE.Color(this.color) },
        uIntensity: { value: this.intensity },
      },
      vertexShader: QUAD_VERT,
      fragmentShader: DISPLAY_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.bindEvents();
    this.handleResize();
    this.start();
  }

  private pickFloatType(): THREE.TextureDataType {
    const gl = this.renderer.getContext();
    // WebGL2 supports HalfFloat render targets universally. Fall back to
    // UnsignedByte if for some reason half-float textures aren't usable.
    const isWebGL2 =
      typeof WebGL2RenderingContext !== 'undefined' &&
      gl instanceof WebGL2RenderingContext;
    if (isWebGL2) return THREE.HalfFloatType;

    const ext =
      gl.getExtension('OES_texture_half_float') &&
      gl.getExtension('OES_texture_half_float_linear');
    return ext ? THREE.HalfFloatType : THREE.UnsignedByteType;
  }

  private bindEvents(): void {
    const { signal } = this.abort;

    const onPointerMove = (e: PointerEvent) => {
      this.updatePointer(e.clientX, e.clientY);
    };
    const onPointerDown = (e: PointerEvent) => {
      this.updatePointer(e.clientX, e.clientY, /*forceSplash*/ true);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      this.updatePointer(t.clientX, t.clientY);
    };
    const onPointerLeave = () => {
      this.pointer.active = false;
    };
    const onResize = () => this.handleResize();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        this.stop();
      } else if (this.enabled && !this.disposed) {
        this.start();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { signal, passive: true });
    window.addEventListener('pointerdown', onPointerDown, { signal, passive: true });
    window.addEventListener('touchmove', onTouchMove, { signal, passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { signal });
    window.addEventListener('blur', onPointerLeave, { signal });
    window.addEventListener('resize', onResize, { signal });
    document.addEventListener('visibilitychange', onVisibility, { signal });
  }

  private updatePointer(clientX: number, clientY: number, forceSplash = false): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const u = (clientX - rect.left) / rect.width;
    const v = 1 - (clientY - rect.top) / rect.height;

    if (u < 0 || u > 1 || v < 0 || v > 1) return;

    const now = performance.now();

    // First event after activation: initialize in-place so we never sweep a
    // phantom wake from the default (-1, -1) origin into the viewport.
    if (!this.pointer.active) {
      this.pointer.uv.set(u, v);
      this.pointer.velocity.set(0, 0);
      this.pointer.smoothedSpeed = 0;
      this.pointer.active = true;
      this.pointer.lastMoveTime = now;
      return;
    }

    const dx = u - this.pointer.uv.x;
    const dy = v - this.pointer.uv.y;
    this.pointer.velocity.set(dx, dy);

    const spd = Math.hypot(dx, dy);
    if (spd > 1e-5) {
      // Smooth the travel direction so brief jitter doesn't whip the wake
      // around; fast motion still re-orients it within a couple of frames.
      const lerp = 0.6;
      this.pointer.dir.set(
        this.pointer.dir.x * (1 - lerp) + (dx / spd) * lerp,
        this.pointer.dir.y * (1 - lerp) + (dy / spd) * lerp,
      );
      const dlen = this.pointer.dir.length();
      if (dlen > 1e-5) this.pointer.dir.divideScalar(dlen);
    }
    this.pointer.smoothedSpeed =
      this.pointer.smoothedSpeed * 0.5 + spd * 0.5;

    this.pointer.uv.set(u, v);
    this.pointer.lastMoveTime = now;

    if (forceSplash) {
      // A click feels nicer with a brief burst of speed so the wake pops.
      this.pointer.smoothedSpeed = Math.max(this.pointer.smoothedSpeed, 0.01);
    }
  }

  private start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.step();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private step(): void {
    if (!this.enabled) return;

    // 1) Inject impulse from pointer movement into rtA, reading from rtB.
    if (this.pointer.active) {
      const speed = this.pointer.smoothedSpeed;
      const idle = (performance.now() - this.pointer.lastMoveTime) / 1000;
      const idleFalloff = Math.max(0, 1 - idle * 8);
      // Normalize speed to 0..1 — 100px on a 1000px viewport = 0.1 in UV.
      const speedScaled = Math.min(1, speed * 10);

      const strength =
        (0.15 + 0.85 * speedScaled) * this.intensity * idleFalloff;

      if (strength > 0.001) {
        // Head is a compact circle at the cursor; the tail widens behind it
        // along -dir, producing the arrow/teardrop wake shape. Keep the tail
        // compact so ripples stay near the pointer and never form a long,
        // straight shadow edge.
        const headRadius = (this.rippleSize / this.simSize) * 0.5;
        const tailRadius = headRadius * (1 + 2.5 * speedScaled);
        const wakeLength = 0.015 + 0.08 * speedScaled;

        this.impulseMaterial.uniforms['uPrev'].value = this.rtB.texture;
        this.impulseMaterial.uniforms['uPoint'].value.copy(this.pointer.uv);
        this.impulseMaterial.uniforms['uDir'].value.copy(this.pointer.dir);
        this.impulseMaterial.uniforms['uHeadRadius'].value = headRadius;
        this.impulseMaterial.uniforms['uTailRadius'].value = tailRadius;
        this.impulseMaterial.uniforms['uWakeLength'].value = wakeLength;
        this.impulseMaterial.uniforms['uStrength'].value = strength;

        this.quad.material = this.impulseMaterial;
        this.renderer.setRenderTarget(this.rtA);
        this.renderer.render(this.scene, this.camera);

        // Move the fresh state into B so the wave step reads it below.
        const tmp = this.rtA;
        this.rtA = this.rtB;
        this.rtB = tmp;
      }
    }

    // 2) Wave propagation step: read from rtB, write to rtA.
    this.waveMaterial.uniforms['uPrev'].value = this.rtB.texture;
    this.waveMaterial.uniforms['uDamping'].value = this.damping;
    this.quad.material = this.waveMaterial;
    this.renderer.setRenderTarget(this.rtA);
    this.renderer.render(this.scene, this.camera);

    // Swap so rtB always holds the latest state for the next frame.
    const tmp = this.rtA;
    this.rtA = this.rtB;
    this.rtB = tmp;

    // 3) Composite to screen.
    this.displayMaterial.uniforms['uHeight'].value = this.rtB.texture;
    (this.displayMaterial.uniforms['uColor'].value as THREE.Color).set(this.color);
    this.displayMaterial.uniforms['uIntensity'].value = this.intensity;
    this.quad.material = this.displayMaterial;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }

  private handleResize(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
  }

  private dispose(): void {
    if (this.quad) {
      (this.quad.geometry as THREE.BufferGeometry).dispose();
    }
    this.waveMaterial?.dispose();
    this.impulseMaterial?.dispose();
    this.displayMaterial?.dispose();
    this.rtA?.dispose();
    this.rtB?.dispose();
    this.renderer?.dispose();
  }
}

/* ------------------------------- shaders ------------------------------- */

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Wave equation step. R = current height, G = previous height.
 * Using the discrete laplacian of the four neighbors, we compute
 *   h_next = 2*h - h_prev + c * laplacian(h)
 * and attenuate by uDamping so ripples naturally dissipate.
 */
const WAVE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform vec2 uTexel;
  uniform float uDamping;

  void main() {
    vec4 c  = texture2D(uPrev, vUv);
    float h = c.r;
    float hPrev = c.g;

    float n = texture2D(uPrev, vUv + vec2(0.0,  uTexel.y)).r;
    float s = texture2D(uPrev, vUv - vec2(0.0,  uTexel.y)).r;
    float e = texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r;
    float w = texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).r;

    float lap = (n + s + e + w) - 4.0 * h;
    float hNext = (2.0 * h - hPrev + 0.5 * lap) * uDamping;

    gl_FragColor = vec4(hNext, h, 0.0, 1.0);
  }
`;

/**
 * Arrow/teardrop-shaped impulse.
 *
 * Head is a tight disc centered at the cursor. Behind the cursor (along
 * -uDir) the impulse widens linearly from uHeadRadius to uTailRadius over
 * uWakeLength, then caps off. In front of the cursor the impulse decays as a
 * normal Gaussian circle. Only the current-height channel (R) is raised so
 * the wave equation sees real velocity and the shape propagates as ripples.
 */
const IMPULSE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform vec2 uPoint;
  uniform vec2 uDir;
  uniform float uHeadRadius;
  uniform float uTailRadius;
  uniform float uWakeLength;
  uniform float uStrength;

  void main() {
    vec4 prev = texture2D(uPrev, vUv);

    vec2 fromCursor = vUv - uPoint;
    // behind > 0 when the fragment is behind the cursor (opposite travel dir)
    float behind = -dot(fromCursor, uDir);
    // Perpendicular displacement from the motion axis.
    vec2 perpVec = fromCursor + uDir * behind;
    float perp = length(perpVec);

    float t = clamp(behind / max(uWakeLength, 1e-5), 0.0, 1.0);
    float r = mix(uHeadRadius, uTailRadius, t);

    float perpFall = exp(-(perp * perp) / (r * r));
    float alongFall;
    if (behind < 0.0) {
      // Ahead of the cursor: compact circular head.
      alongFall = exp(-(behind * behind) / (uHeadRadius * uHeadRadius));
    } else if (behind > uWakeLength) {
      // Past the tail: smoothly fall off using the widest radius.
      float past = behind - uWakeLength;
      alongFall = exp(-(past * past) / (uTailRadius * uTailRadius));
    } else {
      // Inside the wake, taper from 1 at the head to a low value at the tail
      // tip. A varying height along the wake prevents the knife-edge shadow
      // that a flat plateau would produce under directional shading.
      alongFall = mix(1.0, 0.3, smoothstep(0.0, 1.0, t));
    }

    // Strength fades from head to tail so the freshest energy stays at the
    // cursor tip, giving the wake a sense of direction.
    float strengthScale = mix(1.0, 0.35, t);
    float add = uStrength * perpFall * alongFall * strengthScale;

    gl_FragColor = vec4(prev.r + add, prev.g, 0.0, 1.0);
  }
`;

/**
 * 3D water shading from the heightfield gradient.
 *
 * Ripples are rendered with a narrow specular highlight on slopes pointing
 * toward a virtual light, and a very thin rim darkening on slopes pointing
 * away. Both lobes use a high power so they cover only the actual wave
 * crests — not the valleys between them. A broad diffuse shadow was
 * intentionally avoided because adjacent parallel ripples would share their
 * shadow sides and fuse into a continuous dark seam that reads as a line.
 */
const DISPLAY_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uHeight;
  uniform vec2 uTexel;
  uniform vec3 uColor;
  uniform float uIntensity;

  void main() {
    float hx = texture2D(uHeight, vUv + vec2(uTexel.x, 0.0)).r
             - texture2D(uHeight, vUv - vec2(uTexel.x, 0.0)).r;
    float hy = texture2D(uHeight, vUv + vec2(0.0, uTexel.y)).r
             - texture2D(uHeight, vUv - vec2(0.0, uTexel.y)).r;

    vec2 slope = vec2(hx, hy);
    float slopeMag = length(slope);
    vec2 slopeDir = slopeMag > 1e-6 ? slope / slopeMag : vec2(0.0);

    vec2 lightDir = normalize(vec2(0.4, 0.8));
    float lightDot = dot(slopeDir, lightDir);

    // Visibility mask: only slopes above a threshold are drawn. The floor is
    // raised slightly so faint residual slope between ripples fades out and
    // can't stitch adjacent shadow edges together.
    float mask = smoothstep(0.0015, 0.022, slopeMag);

    // Narrow specular highlight on the lit face of each crest. pow(N)=5
    // gives a tight lobe — bright only on the crest itself, transparent in
    // the valleys between crests, so nothing fills the gap visually.
    float spec = pow(max(0.0, lightDot), 5.0) * mask;

    // Thin rim darkening on the opposite face. Even higher power and a low
    // multiplier keep it from bleeding between ripples.
    float rim = pow(max(0.0, -lightDot), 6.0) * mask;

    float hi = spec * 0.40 * uIntensity;
    float sh = rim * 0.06 * uIntensity;

    vec3 rgb = vec3(hi) + uColor * sh;
    float alpha = hi + sh;
    gl_FragColor = vec4(rgb, alpha);
  }
`;
