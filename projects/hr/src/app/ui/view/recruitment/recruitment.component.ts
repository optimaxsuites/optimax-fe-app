import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { RecruitmentListComponent } from './recruitment-list/recruitment-list.component';
import { CandidateComponent } from './candidate/candidate.component';
import { ScheduledInterviewComponent } from './scheduled-interview/scheduled-interview.component';

@Component({
  selector: 'app-recruitment',
  templateUrl: './recruitment.component.html',
  styleUrl: './recruitment.component.scss'
})
export class RecruitmentComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Job Vacancy', component: RecruitmentListComponent, icon:"fa fa-briefcase" },
    { name: 'Job Applications', component: CandidateComponent },
    { name: 'Interview', component: ScheduledInterviewComponent },
  ];
}
