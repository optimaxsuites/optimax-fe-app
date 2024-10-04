import { Component } from '@angular/core';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';
import { CandidateComponent } from '../candidate/candidate.component';
import { ScheduledInterviewComponent } from '../scheduled-interview/scheduled-interview.component';
import { RecruitmentListComponent } from './recruitment-list/recruitment-list.component';

@Component({
  selector: 'app-recuitment',
  templateUrl: './recuitment.component.html',
  styleUrl: './recuitment.component.scss'
})
export class RecuitmentComponent {
  
  tabsConfig: TabConfig[] = [
    { name: 'Job Posting', component: RecruitmentListComponent },
    { name: 'Job Applications', component: CandidateComponent },
    { name: 'Interview', component: ScheduledInterviewComponent },
    // { name: 'Score Sheet', component: InterviewScoreSheetComponent },
  ];

}
