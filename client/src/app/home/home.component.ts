import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CategorySection, PROFILE, Photo } from '../gallery.data';
import { GalleryImageComponent } from '../shared/gallery-image/gallery-image.component';
import { GalleryViewerComponent } from '../shared/gallery-viewer/gallery-viewer.component';

interface CategoryGroup extends CategorySection {
  photos: Photo[];
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [GalleryImageComponent, GalleryViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly profile = PROFILE;

  /** Photos bucketed by category, in the order declared in `categories`. */
  readonly groups: CategoryGroup[] = this.profile.categories.map((c) => ({
    ...c,
    photos: this.profile.photos.filter((p) => p.category === c.id),
  }));

  readonly viewerOpen = signal(false);
  readonly viewerStart = signal(0);
  readonly viewerMode = signal<'grid' | 'single'>('grid');

  openViewer(startIndex = 0, mode: 'grid' | 'single' = 'grid'): void {
    this.viewerStart.set(startIndex);
    this.viewerMode.set(mode);
    this.viewerOpen.set(true);
  }

  closeViewer(): void {
    this.viewerOpen.set(false);
  }

  indexOf(photo: Photo): number {
    return this.profile.photos.indexOf(photo);
  }
}
