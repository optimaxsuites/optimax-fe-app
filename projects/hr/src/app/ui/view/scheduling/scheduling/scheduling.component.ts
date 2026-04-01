import { Component } from '@angular/core';
import { TabConfig } from '../../../shared-component/service/interface/data';
import { ShiftListComponent } from '../../workschedule-shifts/shift-list/shift-list.component';
import { ShiftCalendarComponent } from '../../workschedule-shifts/shift-calendar/shift-calendar.component';
@Component({
  selector: 'app-scheduling',
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.scss'
})
export class SchedulingComponent {
 tabsConfig: TabConfig[] = [
      { name: 'Shift List', 
        component: ShiftListComponent
       },
       { name: 'Shift Calendar',
        component: ShiftCalendarComponent
       }
      
      // { name: 'Time Sheet', component: TimeSheetComponent }
    ];
}
