import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PROFILE, Photo } from '../gallery.data';
import { GalleryViewerComponent } from '../shared/gallery-viewer/gallery-viewer.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [GalleryViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly profile = PROFILE;

  readonly featuredPhotos: Photo[] = this.profile.photos.filter(
    (p) => p.featured,
  );

  readonly viewerOpen = signal(false);
  readonly viewerStart = signal(0);

  openViewer(startIndex = 0): void {
    this.viewerStart.set(startIndex);
    this.viewerOpen.set(true);
  }

  closeViewer(): void {
    this.viewerOpen.set(false);
  }

  indexOf(photo: Photo): number {
    return this.profile.photos.indexOf(photo);
  }
}
