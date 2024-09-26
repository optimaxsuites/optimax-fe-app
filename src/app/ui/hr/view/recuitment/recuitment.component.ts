import { Component } from '@angular/core';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';
import { RecuitmentFormComponent } from '../recuitment-form/recuitment-form.component';
import { CandidateComponent } from '../candidate/candidate.component';
import { VacancyComponent } from '../vacancy/vacancy.component';
import { ScheduledInterviewComponent } from '../scheduled-interview/scheduled-interview.component';

@Component({
  selector: 'app-recuitment',
  templateUrl: './recuitment.component.html',
  styleUrl: './recuitment.component.scss'
})
export class RecuitmentComponent {






  tabsConfig: TabConfig[] = [
    { name: 'Job Posting', component: RecuitmentFormComponent },
    { name: 'Candidate', component: CandidateComponent },
    { name: 'Scheduled Interview', component: ScheduledInterviewComponent },
    { name: 'Score Sheet', component: CandidateComponent },
  ];
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

  }
}
