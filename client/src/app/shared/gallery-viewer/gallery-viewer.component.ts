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
  signal,
} from '@angular/core';
import { Photo } from '../../gallery.data';

/**
 * Editorial gallery viewer with two modes:
 *
 *  - `grid`   — contact-sheet of every photo. Entry point from nav and
 *               the "View all photos" CTA. Click a tile to drill in.
 *  - `single` — full-bleed lightbox for one photo. Entry point when a
 *               featured photo is clicked from the home scatter, or
 *               from a tile in the grid.
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
}
