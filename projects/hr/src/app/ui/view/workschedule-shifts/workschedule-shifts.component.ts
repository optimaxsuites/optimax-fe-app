import { Component, OnInit } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { ShiftCalendarComponent } from './shift-calendar/shift-calendar.component';
import { MyScheduleComponent } from './my-schedule/my-schedule.component';

@Component({
  selector: 'app-workschedule-shifts',
  templateUrl: './workschedule-shifts.component.html',
  styleUrl: './workschedule-shifts.component.scss'
})
export class WorkscheduleShiftsComponent implements OnInit {
  tabsConfig: TabConfig[] = [];

  ngOnInit(): void {
    // Shift List is no longer a tab — it lives behind the "Shifts" button in
    // the Shift Calendar view switcher.
    this.tabsConfig = [
      { name: 'Shift Calendar', component: ShiftCalendarComponent },
      { name: 'My Schedule', component: MyScheduleComponent }
    ];
  }

}
