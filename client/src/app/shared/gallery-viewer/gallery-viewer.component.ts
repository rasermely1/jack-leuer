import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  effect,
  signal,
} from '@angular/core';
import { Photo } from '../../gallery.data';
import { GALLERY_MANIFEST } from '../../gallery.manifest';
import { GalleryImageComponent } from '../gallery-image/gallery-image.component';

/**
 * Editorial gallery viewer with two modes:
 *
 *  - `grid`   — contact-sheet of every photo. Entry point from nav and
 *               the "View all photos" CTA. Click a tile to drill in.
 *  - `single` — full-bleed lightbox for one photo. Entry point when
 *               any photo in the home masonry is clicked, or when a
 *               tile in the contact-sheet grid is selected.
 *
 * Keyboard:
 *  - Arrow keys step through photos in `single` mode.
 *  - Esc closes from `grid`; in `single` it returns to `grid` so the
 *    visitor can keep browsing without losing the lightbox entirely.
 */
@Component({
  selector: 'app-gallery-viewer',
  templateUrl: './gallery-viewer.component.html',
  styleUrl: './gallery-viewer.component.scss',
  imports: [GalleryImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryViewerComponent implements OnChanges {
  @Input({ required: true }) photos: Photo[] = [];
  @Input() open = false;
  @Input() startIndex = 0;
  @Input() startMode: 'grid' | 'single' = 'grid';

  @Output() closed = new EventEmitter<void>();

  readonly index = signal(0);
  readonly mode = signal<'grid' | 'single'>('grid');

  readonly current = computed<Photo | null>(() => {
    const list = this.photos;
    if (!list.length) return null;
    return list[this.index()] ?? null;
  });

  readonly counter = computed(() => {
    const total = this.photos.length;
    return total ? `${this.index() + 1} / ${total}` : '';
  });

  /**
   * Warm the browser's image cache for the photos on either side of the
   * current one in single-mode so arrow-key navigation feels instant
   * instead of "click → wait → image appears".
   */
  private readonly preloadNeighborsEffect = effect(() => {
    if (!this.open || this.mode() !== 'single') return;
    const total = this.photos.length;
    if (total < 2) return;
    const i = this.index();
    const neighbors = [(i + 1) % total, (i - 1 + total) % total];
    for (const n of neighbors) {
      const photo = this.photos[n];
      if (!photo) continue;
      this.preloadPhoto(photo);
    }
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      const start = Math.max(0, Math.min(this.startIndex, this.photos.length - 1));
      this.index.set(start);
      this.mode.set(this.startMode);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
    }

    if (changes['open'] && !this.open && typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  next(): void {
    const total = this.photos.length;
    if (!total) return;
    this.index.set((this.index() + 1) % total);
  }

  prev(): void {
    const total = this.photos.length;
    if (!total) return;
    this.index.set((this.index() - 1 + total) % total);
  }

  close(): void {
    if (!this.open) return;
    this.closed.emit();
  }

  selectPhoto(i: number): void {
    this.index.set(i);
    this.mode.set('single');
  }

  backToGrid(): void {
    this.mode.set('grid');
  }

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.open) return;
    switch (event.key) {
      case 'ArrowRight':
        if (this.mode() === 'single') {
          event.preventDefault();
          this.next();
        }
        break;
      case 'ArrowLeft':
        if (this.mode() === 'single') {
          event.preventDefault();
          this.prev();
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (this.mode() === 'single') {
          this.backToGrid();
        } else {
          this.close();
        }
        break;
    }
  }

  /** Backdrop click closes from grid; in single mode it returns to grid. */
  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target?.dataset['backdrop'] !== 'true') return;
    if (this.mode() === 'single') {
      this.backToGrid();
    } else {
      this.close();
    }
  }

  /** Image click in single mode steps forward (shift = back). */
  onImageClick(event: MouseEvent): void {
    if (event.shiftKey) {
      this.prev();
    } else {
      this.next();
    }
  }

  /**
   * Kick off a low-priority download of a single sized variant of the
   * given photo so it'll already be in the browser cache by the time
   * the visitor steps to it. We pick a 1600w AVIF — large enough to
   * look great in the lightbox at typical desktop sizes, and small
   * enough that pre-fetching one for each neighbour is cheap.
   */
  private preloadPhoto(photo: Photo): void {
    if (typeof Image === 'undefined') return;
    const entry = GALLERY_MANIFEST.photos[photo.file];
    if (!entry) return;
    const target = entry.widths.find((w) => w >= 1600) ?? entry.widths.at(-1);
    if (!target) return;
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.src = `/img/${entry.base}/${target}.avif`;
  }
}
