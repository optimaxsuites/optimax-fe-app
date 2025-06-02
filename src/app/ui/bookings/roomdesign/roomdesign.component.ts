import { Component } from '@angular/core';

@Component({
  selector: 'app-roomdesign',
  templateUrl: './roomdesign.component.html',
  styleUrl: './roomdesign.component.scss',
})
export class RoomdesignComponent {
  darkMode = false;

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
  }
}
