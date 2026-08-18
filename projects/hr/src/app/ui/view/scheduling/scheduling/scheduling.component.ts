import { Component, OnInit } from '@angular/core';
import { TabConfig } from '../../../shared-component/service/interface/data';
import { ShiftListComponent } from '../../workschedule-shifts/shift-list/shift-list.component';
import { ShiftCalendarComponent } from '../../workschedule-shifts/shift-calendar/shift-calendar.component';
import { MyScheduleComponent } from '../../workschedule-shifts/my-schedule/my-schedule.component';

@Component({
  selector: 'app-scheduling',
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.scss'
})
export class SchedulingComponent implements OnInit {
  tabsConfig: TabConfig[] = [];

  ngOnInit(): void {
    this.tabsConfig = [
      {
        name: 'Shift Calendar',
        component: ShiftCalendarComponent
      },
      {
        name: 'Shift List',
        component: ShiftListComponent
      },
      {
        name: 'My Schedule',
        component: MyScheduleComponent
      }
    ];
  }
}
