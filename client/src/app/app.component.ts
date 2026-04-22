import { Component } from '@angular/core';
import { HomeComponent } from './home/home.component';

@Component({
  selector: 'app-root',
  imports: [HomeComponent],
  template: '<app-home />',
  styles: ':host { display: block; min-height: 100vh; }',
})
export class AppComponent {}
