import { Component } from '@angular/core';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';
import { ScheduledInterviewComponent } from '../scheduled-interview/scheduled-interview.component';

@Component({
  selector: 'app-interview',
  templateUrl: './interview.component.html',
  styleUrl: './interview.component.scss'
})
export class InterviewComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Scheduled Interview', component: ScheduledInterviewComponent },
    // { name: 'My attendance', component: MyAttendanceComponent },
  ];
}
