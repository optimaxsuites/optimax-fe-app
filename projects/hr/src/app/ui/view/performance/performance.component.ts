import { Component } from '@angular/core';
import { AppraisallistComponent } from './appraisallist/appraisallist.component';
import { TabConfig } from '../../shared-component/service/interface/data';
import { AppraisalcycleComponent } from './appraisalcycle/appraisalcycle.component';
import { GoalComponent } from './goal/goal.component';

@Component({
  selector: 'app-performance',
  templateUrl: './performance.component.html',
  styleUrl: './performance.component.scss',
})
export class PerformanceComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Appraisal List', component: AppraisallistComponent },
    { name: 'Appraisal Cycle', component: AppraisalcycleComponent },
    { name: 'Goal', component: GoalComponent },
  ];
}
