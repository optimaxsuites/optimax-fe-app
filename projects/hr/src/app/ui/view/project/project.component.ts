import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { ProjectListComponent } from './project-list/project-list.component';
import { MyProjectComponent } from './my-project/my-project.component';

@Component({
  selector: 'app-project',
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss'
})
export class ProjectComponent {
  tabsConfig: TabConfig[] = [
    { name: 'My Projects', component: MyProjectComponent },
    { name: 'Projects', component: ProjectListComponent },
    // { name: 'Time Sheet', component: TimeSheetComponent }
  ];
}
