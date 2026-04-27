import { Component } from '@angular/core';
import { HomeComponent } from './home/home.component';
import { WaterTrailComponent } from './shared/water-trail/water-trail.component';

@Component({
  selector: 'app-root',
  imports: [HomeComponent, WaterTrailComponent],
  template: `
    @if (waterTrailEnabled) {
      <app-water-trail [intensity]="0.25" [rippleSize]="10" />
    }
    <app-home />
  `,
  styles: ':host { display: block; min-height: 100vh; }',
})
export class AppComponent {
  // Feature flag: keep the effect code available but disabled in production UI.
  readonly waterTrailEnabled = false;
}
