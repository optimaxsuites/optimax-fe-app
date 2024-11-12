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
    { name: ' Assessment List', component: AppraisallistComponent },
    { name: ' Assessment Cycle', component: AppraisalcycleComponent },
    { name: 'Target', component: TargetComponent },
    { name: 'My Target', component: GoalComponent },
  ];
}
