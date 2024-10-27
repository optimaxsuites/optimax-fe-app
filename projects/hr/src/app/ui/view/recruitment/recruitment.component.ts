import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';

@Component({
  selector: 'app-recruitment',
  templateUrl: './recruitment.component.html',
  styleUrl: './recruitment.component.scss'
})
export class RecruitmentComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Job Vacancy', component: RecruitmentListComponent },
    { name: 'Job Applications', component: CandidateComponent },
    { name: 'Interview', component: ScheduledInterviewComponent },
    // { name: 'Score Sheet', component: InterviewScoreSheetComponent },
  ];
}
