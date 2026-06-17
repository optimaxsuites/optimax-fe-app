import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { ShiftListComponent } from './shift-list/shift-list.component';
import { ShiftCalendarComponent } from './shift-calendar/shift-calendar.component';
import { MyScheduleComponent } from './my-schedule/my-schedule.component';

@Component({
  selector: 'app-workschedule-shifts',
  templateUrl: './workschedule-shifts.component.html',
  styleUrl: './workschedule-shifts.component.scss'
})
export class WorkscheduleShiftsComponent {
   tabsConfig: TabConfig[] = [
      { name: 'Shift Calendar',
        component: ShiftCalendarComponent
      },
      { name: 'Shift List', 
        component: ShiftListComponent
       },
       {
        name: 'My Schedule',
        component: MyScheduleComponent
       }
       
      
      // { name: 'Time Sheet', component: TimeSheetComponent }
    ];

}
