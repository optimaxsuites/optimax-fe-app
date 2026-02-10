import { Component, OnInit } from '@angular/core';

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT' | 'ON_BREAK';

@Component({
  selector: 'app-checkin-checkout',
  templateUrl: './checkin-checkout.component.html',
  styleUrl: './checkin-checkout.component.scss'
})
export class CheckinCheckoutComponent implements OnInit {
  currentTime = new Date();
  status: ClockStatus = 'CLOCKED_OUT';
  

  ngOnInit() {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  toggleClock() {
    if (this.status === 'CLOCKED_OUT') {
      this.status = 'CLOCKED_IN';
    } else {
      this.status = 'CLOCKED_OUT';
    }
  }

}
