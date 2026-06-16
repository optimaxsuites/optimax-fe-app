import { Component } from '@angular/core';
import { TabConfig } from '../../../shared-component/service/interface/data';
import { ShiftListComponent } from '../../workschedule-shifts/shift-list/shift-list.component';
import { ShiftCalendarComponent } from '../../workschedule-shifts/shift-calendar/shift-calendar.component';
//import { MySchedulesComponent } from './my-schedules/my-schedules.component';
// import { SchedulesComponent } from './schedules/schedules.component';
import { TimeSheetComponent } from '../../attendance/time-sheet/time-sheet.component';
import { MyScheduleComponent } from '../../workschedule-shifts/my-schedule/my-schedule.component';

@Component({
  selector: 'app-scheduling',
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.scss'
})
export class SchedulingComponent {
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

      },
      // {
      //   name: 'beta Schedules',
      //   component: SchedulesComponent
      // },
      // {
      //   name: 'beta My Schedule',
      //   component: MySchedulesComponent
      // },
       
      
      { name: 'Time Sheet', component: TimeSheetComponent }
    ];
}
