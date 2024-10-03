import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-clock-in-clock-out',
  templateUrl: './clock-in-clock-out.component.html',
  styleUrls: ['./clock-in-clock-out.component.scss'],
  providers: [DatePipe]
})
export class ClockInClockOutComponent implements OnInit {
  isClockedIn = false;
  clockedInTime: string | null = ''; // Allow null values
  currentDate: string | null = '';   // Allow null values
  currentTime: string | null = '';   // Allow null values
  note: string = '';

  // Emit clock-in time to parent (AppComponent)
  @Output() clockInTime = new EventEmitter<string | null>();

  constructor(private datePipe: DatePipe) {}

  ngOnInit() {
    this.updateDateTime();
  }

  toggleClockInOut() {
    this.isClockedIn = !this.isClockedIn;

    if (this.isClockedIn) {
      this.clockedInTime = this.datePipe.transform(new Date(), 'yyyy-MM-dd HH:mm:ss');
      this.clockInTime.emit(this.clockedInTime); // Emit the clock-in time to the parent
    } else {
      this.clockedInTime = null;  // Set clockedInTime to null when clocking out
      this.clockInTime.emit(this.clockedInTime); // Emit null when clocking out
    }
  }

  updateDateTime() {
    const now = new Date();
    this.currentDate = this.datePipe.transform(now, 'yyyy-MM-dd');
    this.currentTime = this.datePipe.transform(now, 'HH:mm:ss');

    // Update time every second
    setInterval(() => {
      this.updateDateTime();
    }, 1000);
  }
}
