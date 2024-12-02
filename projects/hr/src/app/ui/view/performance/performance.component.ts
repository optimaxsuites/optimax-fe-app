import { Component } from '@angular/core';
import { AppraisallistComponent } from './appraisallist/appraisallist.component';
import { TabConfig } from '../../shared-component/service/interface/data';
import { AppraisalcycleComponent } from './appraisalcycle/appraisalcycle.component';
import { GoalComponent } from './goal/goal.component';
import { TargetComponent } from './target/target.component';

@Component({
  selector: 'app-performance',
  templateUrl: './performance.component.html',
  styleUrl: './performance.component.scss',
})
export class PerformanceComponent {
  tabsConfig: TabConfig[] = [
    { name: ' Task', component: AppraisallistComponent },
    { name: ' Appraisal', component: AppraisalcycleComponent },
    { name: 'Target', component: TargetComponent }, // role: 'ROLE_ADMIN'
  ];
}
