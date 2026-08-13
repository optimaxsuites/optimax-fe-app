import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { ShiftCalendarComponent } from './shift-calendar/shift-calendar.component';
import { MyScheduleComponent } from './my-schedule/my-schedule.component';

@Component({
  selector: 'app-workschedule-shifts',
  templateUrl: './workschedule-shifts.component.html',
  styleUrl: './workschedule-shifts.component.scss'
})
export class WorkscheduleShiftsComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Shift Calendar', component: ShiftCalendarComponent, icon: 'fa-solid fa-calendar' },
    { name: 'My Schedule', component: MyScheduleComponent, icon: 'fa-solid fa-calendar-check' }
  ];
}
