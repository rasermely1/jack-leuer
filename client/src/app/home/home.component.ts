import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Look, PROFILE, lookSrc } from '../gallery.data';

type View = 'reel' | 'index';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  @ViewChild('scrollRoot') scrollRoot?: ElementRef<HTMLElement>;
  @ViewChildren('reelSlide') reelSlides!: QueryList<ElementRef<HTMLElement>>;

  readonly profile = PROFILE;
  readonly looks = PROFILE.looks;
  readonly view = signal<View>('reel');
  readonly activeIndex = signal(0);
  readonly scrollProgress = signal(0);
  readonly announce = signal('');

  readonly counter = computed(() => {
    const i = this.activeIndex();
    const total = this.looks.length;
    return `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  });

  readonly activeTitle = computed(
    () => this.looks[this.activeIndex()]?.title ?? ''
  );

  private observer: IntersectionObserver | null = null;
  private reduceMotion = false;

  private readonly onKeydown = (event: KeyboardEvent) =>
    this.handleKeydown(event);

  constructor() {
    if (typeof matchMedia !== 'undefined') {
      this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    this.document.addEventListener('keydown', this.onKeydown, true);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('keydown', this.onKeydown, true);
      this.observer?.disconnect();
    });
  }

  ngAfterViewInit(): void {
    this.reelSlides.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.bindObserver());
    this.bindObserver();
    queueMicrotask(() => this.markLoadedImages());
  }

  src(look: Look): string {
    return lookSrc(look);
  }

  trackById(_i: number, look: Look): string {
    return look.id;
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) {
      this.scrollProgress.set(0);
      return;
    }
    this.scrollProgress.set(Math.min(1, Math.max(0, el.scrollTop / max)));
  }

  onImageLoad(event: Event): void {
    const img = event.target;
    if (img instanceof HTMLImageElement) {
      img.classList.add('is-loaded');
    }
  }

  toggleIndex(): void {
    this.view.update((v) => (v === 'index' ? 'reel' : 'index'));
  }

  closeIndex(): void {
    if (this.view() === 'index') this.view.set('reel');
  }

  jumpTo(index: number): void {
    this.view.set('reel');
    queueMicrotask(() => this.scrollToIndex(index, true));
  }

  scrollToSection(id: string): void {
    const el = this.document.getElementById(id);
    if (!el) return;
    const root = this.scrollRoot?.nativeElement;
    if (!root) return;
    root.scrollTo({
      top: el.offsetTop,
      behavior: this.reduceMotion ? 'auto' : 'smooth',
    });
  }

  private scrollToIndex(index: number, announce = false): void {
    const el = this.reelSlides.get(index)?.nativeElement;
    const root = this.scrollRoot?.nativeElement;
    if (!el || !root) return;
    root.scrollTo({
      top: el.offsetTop,
      behavior: this.reduceMotion ? 'auto' : 'smooth',
    });
    if (announce) this.announceFor(index);
  }

  private handleKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      target.closest('input, textarea, select, [contenteditable=true]')
    ) {
      return;
    }

    if (event.key === 'Escape' && this.view() === 'index') {
      event.preventDefault();
      this.closeIndex();
      return;
    }

    if (event.key === 'g' || event.key === 'G') {
      event.preventDefault();
      this.toggleIndex();
      return;
    }

    if (this.view() === 'index') return;

    const n = this.looks.length;
    if (n === 0) return;

    let delta: number | null = null;
    let goFirst = false;
    let goLast = false;

    switch (event.key) {
      case 'ArrowDown':
      case 'j':
      case 'J':
      case 'PageDown':
        delta = 1;
        break;
      case 'ArrowUp':
      case 'k':
      case 'K':
      case 'PageUp':
        delta = -1;
        break;
      case 'Home':
        goFirst = true;
        break;
      case 'End':
        goLast = true;
        break;
      default:
        return;
    }

    event.preventDefault();

    const current = this.activeIndex();
    let next = current;
    if (goFirst) next = 0;
    else if (goLast) next = n - 1;
    else if (delta !== null) next = Math.max(0, Math.min(n - 1, current + delta));

    if (next !== current) this.scrollToIndex(next, true);
  }

  private announceFor(index: number): void {
    const look = this.looks[index];
    const base = `Look ${index + 1} of ${this.looks.length}`;
    const msg = look?.title ? `${base}: ${look.title}` : base;
    this.announce.set('');
    queueMicrotask(() => this.announce.set(msg));
  }

  private bindObserver(): void {
    this.observer?.disconnect();
    const nodes = this.reelSlides.map((r) => r.nativeElement);
    if (nodes.length === 0) return;
    const root = this.scrollRoot?.nativeElement ?? null;

    this.observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!top?.target) return;
        const idx = Number((top.target as HTMLElement).dataset['idx']);
        if (!Number.isNaN(idx)) this.activeIndex.set(idx);
      },
      { root, threshold: [0.4, 0.6, 0.8], rootMargin: '-8% 0px -8% 0px' }
    );
    for (const n of nodes) this.observer.observe(n);
  }

  private markLoadedImages(): void {
    const root = this.scrollRoot?.nativeElement;
    if (!root) return;
    for (const img of root.querySelectorAll<HTMLImageElement>('img.reel__img, img.grid__img')) {
      if (img.complete && img.naturalHeight > 0) img.classList.add('is-loaded');
    }
  }
}
