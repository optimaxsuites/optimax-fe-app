import { Component } from '@angular/core';

@Component({
  selector: 'app-roomshero',
  templateUrl: './roomshero.component.html',
  styleUrl: './roomshero.component.scss',
})
export class RoomsheroComponent {
  isDarkTheme = false;

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
  }
}
