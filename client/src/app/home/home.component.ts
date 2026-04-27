import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CategorySection, EVIL_PROFILE, PROFILE, Photo, Profile } from '../gallery.data';
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
  readonly evilProfile = EVIL_PROFILE;
  readonly evilModeEnabled = signal(false);
  readonly activeProfile = computed<Profile>(() =>
    this.evilModeEnabled() ? this.evilProfile : this.profile,
  );

  /** Photos bucketed by category, in the order declared in `categories`. */
  readonly groups = computed<CategoryGroup[]>(() =>
    this.activeProfile().categories.map((c) => ({
      ...c,
      photos: this.activeProfile().photos.filter((p) => p.category === c.id),
    })),
  );

  readonly viewerOpen = signal(false);
  readonly viewerStart = signal(0);
  readonly viewerMode = signal<'grid' | 'single'>('grid');

  unlockEvilMode(): void {
    if (typeof window === 'undefined') return;
    const passkey = window.prompt('Enter passkey');
    if (passkey === 'evilmode') {
      this.evilModeEnabled.set(true);
      this.viewerOpen.set(false);
      return;
    }
    if (passkey !== null && passkey.trim().length > 0) {
      window.alert('Incorrect passkey');
    }
  }

  disableEvilMode(): void {
    this.evilModeEnabled.set(false);
    this.viewerOpen.set(false);
  }

  openViewer(startIndex = 0, mode: 'grid' | 'single' = 'grid'): void {
    this.viewerStart.set(startIndex);
    this.viewerMode.set(mode);
    this.viewerOpen.set(true);
  }

  closeViewer(): void {
    this.viewerOpen.set(false);
  }

  indexOf(photo: Photo): number {
    return this.activeProfile().photos.indexOf(photo);
  }
}
