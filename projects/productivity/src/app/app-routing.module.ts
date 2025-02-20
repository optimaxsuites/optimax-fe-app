

// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductivityComponent } from './ui/view/productivity/productivity.component';
import { ProjectListComponent } from './ui/view/productivity/components/project-list/project-list.component';
import { ProjectComponent } from './ui/view/productivity/components/project/project.component';
import { TargetComponent } from './ui/view/productivity/components/target/target.component';
import { NewTaskComponent } from './ui/view/productivity/components/new-task/new-task.component';
import { ProjectViewComponent } from './ui/view/productivity/components/project-view/project-view.component';
// import { WorkspaceComponent } from './ui/view/productivity/components/workspace/workspace.component';
// import { ReportComponent } from './ui/view/productivity/components/report/report.component';

const routes: Routes = [
  {
    path: 'admin/productivity',
    component: ProductivityComponent,
    children: [
      { path: '', redirectTo: 'project-list', pathMatch: 'full' },
      { path: 'project-list', component: ProjectListComponent },
      { path: 'project', component: ProjectComponent },
      { path: 'target', component: TargetComponent },
      // { path: 'workspace', component: WorkspaceComponent },
      // { path: 'report', component: ReportComponent }
      { path: 'new-task', component: NewTaskComponent },
      {path: 'project-view/:id', component: ProjectViewComponent}
      // {path: 'admin/productivity/project-view/:id', component: ProjectViewComponent}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }