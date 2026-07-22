import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { ShiftListComponent } from './shift-list/shift-list.component';
import { ShiftCalendarComponent } from './shift-calendar/shift-calendar.component';
import { MyScheduleComponent } from './my-schedule/my-schedule.component';
import { TimeSheetComponent } from '../attendance/time-sheet/time-sheet.component';
import { TimesheetApprovalsComponent } from './timesheet-approvals/timesheet-approvals.component';

@Component({
  selector: 'app-workschedule-shifts',
  templateUrl: './workschedule-shifts.component.html',
  styleUrl: './workschedule-shifts.component.scss'
})
export class WorkscheduleShiftsComponent {
   tabsConfig: TabConfig[] = [
      { name: 'Shift Calendar',
        component: ShiftCalendarComponent,
        icon: 'fa-solid fa-calendar'
      },
      { name: 'Shift List',
        component: ShiftListComponent,
        icon: 'fa-solid fa-list'
       },
       {
        name: 'My Schedule',
        component: MyScheduleComponent,
        icon: 'fa-solid fa-calendar-check'
       },
       { name: 'Time Sheet',
        component: TimeSheetComponent,
        icon: 'fa-solid fa-clock'
       },
       { name: 'Timesheet Approvals',
        component: TimesheetApprovalsComponent,
        icon: 'fa-solid fa-check-double'
       }
    ];

}
