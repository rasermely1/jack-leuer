import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  signal,
} from '@angular/core';
import {
  GALLERY_MANIFEST,
  GalleryFormat,
  GalleryPhotoManifest,
} from '../../gallery.manifest';

/**
 * Reusable responsive image. Looks up the source file in the build-time
 * manifest and emits a `<picture>` with AVIF / WebP / JPEG sources, each
 * carrying a full `srcset` so the browser only ever downloads a variant
 * sized for what it'll actually display.
 *
 * Each photo also paints a tiny inlined LQIP (low-quality blurred
 * preview) as the background of its frame, so the page never shows an
 * empty rectangle while waiting for the real image to arrive.
 *
 * Layout shift is prevented by setting `width` and `height` attributes
 * to the source's natural pixel size — the browser then reserves the
 * correct slot before any bytes have arrived.
 */
@Component({
  selector: 'app-gallery-image',
  templateUrl: './gallery-image.component.html',
  styleUrl: './gallery-image.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryImageComponent {
  /** File name (key into the gallery manifest, e.g. `baggy-closeup.jpg`). */
  @Input({ required: true }) set file(value: string) {
    this.fileSig.set(value);
  }

  @Input({ required: true }) alt = '';

  /**
   * `sizes` attribute. Pass the same value you'd give a normal
   * responsive image — it tells the browser how wide the image will
   * render at each breakpoint so it can pick the smallest variant that
   * still looks sharp.
   */
  @Input() sizes = '100vw';

  @Input() fetchPriority: 'high' | 'low' | 'auto' = 'auto';

  @Input() loading: 'lazy' | 'eager' = 'lazy';

  /**
   * Layout strategy:
   *  - `masonry` (default): picture takes its source's natural aspect
   *    ratio; image covers. Use inside flowing column / masonry grids.
   *  - `tile`: aspect ratio is owned by the parent (eg. `aspect-ratio:
   *    4 / 5` on a tile, or a fixed-size hero backdrop); image stretches
   *    to fill the host and covers.
   *  - `stage`: image shrink-wraps to its natural aspect ratio, capped
   *    by the host's max-width / max-height. Used by the lightbox.
   */
  @Input() layout: 'masonry' | 'tile' | 'stage' = 'masonry';

  /**
   * Show the inlined low-quality placeholder behind the image. Disable
   * for images that already sit on a coloured surface where the blur
   * would be visible at the edges.
   */
  @Input() showLqip = true;

  protected readonly fileSig = signal<string>('');

  protected readonly entry = computed<GalleryPhotoManifest | null>(() => {
    const file = this.fileSig();
    return GALLERY_MANIFEST.photos[file] ?? null;
  });

  protected readonly avifSrcset = computed(() => this.buildSrcset('avif'));
  protected readonly webpSrcset = computed(() => this.buildSrcset('webp'));
  protected readonly jpgSrcset = computed(() => this.buildSrcset('jpg'));

  /**
   * Fallback for the `<img src>`: pick the smallest variant that's at
   * least 1200px wide so legacy clients without `srcset` support (very
   * rare in 2026) still get a reasonable file rather than the original.
   */
  protected readonly fallbackSrc = computed(() => {
    const e = this.entry();
    if (!e) return '';
    const pick = e.widths.find((w) => w >= 1200) ?? e.widths.at(-1) ?? e.width;
    return `/img/${e.base}/${pick}.jpg`;
  });

  protected readonly lqipStyle = computed(() => {
    const e = this.entry();
    if (!e || !this.showLqip) return null;
    return `url("${e.lqip}")`;
  });

  private buildSrcset(format: GalleryFormat): string {
    const e = this.entry();
    if (!e) return '';
    return e.widths.map((w) => `/img/${e.base}/${w}.${format} ${w}w`).join(', ');
  }
}
