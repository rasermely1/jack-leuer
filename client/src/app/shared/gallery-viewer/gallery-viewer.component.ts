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
 * A minimal, editorial lightbox. Opens when `open` flips to true, then
 * lets the viewer step through `photos` with arrow keys, on-screen
 * buttons, or a click on either half of the image. Emits `closed` when
 * the viewer dismisses it.
 *
 * The component keeps its own index so the parent only needs to toggle
 * `open` and pass an optional `startIndex`.
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

  @Output() closed = new EventEmitter<void>();

  // Signals drive the template so OnPush updates stay tight.
  readonly index = signal(0);

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
      // Lock body scroll while the viewer is up. Restored on close.
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

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.open) return;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.prev();
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  /** Clicking the backdrop (but not the image / chrome) closes the viewer. */
  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target?.dataset['backdrop'] === 'true') {
      this.close();
    }
  }

  /**
   * Image click = step forward (like a slideshow). Shift-click goes
   * back so power users have a mouse-only path to either direction.
   */
  onImageClick(event: MouseEvent): void {
    if (event.shiftKey) {
      this.prev();
    } else {
      this.next();
    }
  }
}
