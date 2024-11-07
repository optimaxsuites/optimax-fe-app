import { Component } from '@angular/core';
import { TabConfig } from './ui/shared-component/service/interface/data';
import { RecruitmentListComponent } from './ui/view/recruitment/recruitment-list/recruitment-list.component';
import { CandidateComponent } from './ui/view/recruitment/candidate/candidate.component';
import { ScheduledInterviewComponent } from './ui/view/recruitment/scheduled-interview/scheduled-interview.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppHrComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Job Vacancy', component: RecruitmentListComponent },
    { name: 'Job Applications', component: CandidateComponent },
    { name: 'Interview', component: ScheduledInterviewComponent },
  ];
}
