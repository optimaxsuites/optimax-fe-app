import { Component } from '@angular/core';
import { TabConfig } from '../../../shared-component/service/interface/data';
import { MySchedulesComponent } from './my-schedules/my-schedules.component';
import { SchedulesComponent } from './schedules/schedules.component';

@Component({
  selector: 'app-scheduling',
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.scss'
})
export class SchedulingComponent {
 tabsConfig: TabConfig[] = [
    { name: 'My Schedules', component: MySchedulesComponent },
    { name: 'Schedules', component: SchedulesComponent },
    // { name: 'Time Sheet', component: TimeSheetComponent }
  ];
}
