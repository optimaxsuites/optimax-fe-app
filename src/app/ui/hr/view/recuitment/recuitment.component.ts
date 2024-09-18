import { Component } from '@angular/core';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';
import { RecuitmentFormComponent } from '../recuitment-form/recuitment-form.component';
import { CandidateComponent } from '../candidate/candidate.component';
import { VacancyComponent } from '../vacancy/vacancy.component';

@Component({
  selector: 'app-recuitment',
  templateUrl: './recuitment.component.html',
  styleUrl: './recuitment.component.scss'
})
export class RecuitmentComponent {






  tabsConfig: TabConfig[] = [
    { name: 'Form', component: RecuitmentFormComponent },
    { name: 'Candidate', component: CandidateComponent },
    { name: 'Vacancy', component: VacancyComponent },

    // { name: 'view2', component: RfqCategoryListComponent },
    // { 
    //   name: 'Settings', 
    //   component: null, 
    //   hasDropdown: true,
    //   dropdownOptions: [
    //     { label: 'Configurations', action: 'configurations', component: ConfigurationComponent },
    //     { label: 'Users', action: 'users', component: ManageUsersComponent }
    //   ]
    // }
  ];
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

  }
}
