import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Project, ProjectService } from '../../../service/project.service';

@Component({
  selector: 'app-my-project',
  templateUrl: './my-project.component.html',
  styleUrl: './my-project.component.scss'
})
export class MyProjectComponent {
  currentUser = 'John Doe'; // later you can fetch from auth/userService
  myProjects: Project[] = [];
  selectedProject: number = 0
  viewDetail: boolean = false

  constructor(private projectService: ProjectService, private router: Router) {}

  ngOnInit(): void {
    this.myProjects = this.projectService.getProjectsForUser(this.currentUser);
  }

  openProject(project: Project) {
    // this.router.navigate(['/my-projects', project.id]);
    this.viewDetail = true
    this.selectedProject = project.id
  }
}
