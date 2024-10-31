import { Component, HostListener, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ERP-FE';
  sidebarVisible2: boolean = false;

  screenWidth: number;

  // Ensure this property exists and is initialized
  clockedInTime: string | null = null;

  constructor() {
    this.screenWidth = window.innerWidth;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = window.innerWidth;
    console.log('Screen width:', this.screenWidth);
    // Apply logic based on screen width
  }

  // This method should correctly capture the event emitted by ClockInClockOutComponent
  // onClockInTime(time: string | null) {
  //   console.log("Received clock-in time:", time);
  //   this.clockedInTime = time; // Assign the emitted clock-in time
  // }
}
