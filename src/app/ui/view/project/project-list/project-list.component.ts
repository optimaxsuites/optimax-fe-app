import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Project, ProjectService } from '../../../service/project.service';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent {
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  searchTerm = '';
  statusFilter = '';
  dateFilter = '';
  viewDetail: boolean = false
  selectedProject: number = 0
  openCreateForm: boolean = false

  constructor(private projectService: ProjectService, private router: Router) {}

  ngOnInit(): void {
    this.projects = this.projectService.getProjects();
    this.filteredProjects = this.projects;
  }

  filterProjects(): void {
    this.filteredProjects = this.projects.filter(p => {
      const matchesName = p.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.statusFilter ? p.status === this.statusFilter : true;
      const matchesDate = this.dateFilter
        ? new Date(p.startDate) <= new Date(this.dateFilter) &&
          new Date(p.endDate) >= new Date(this.dateFilter)
        : true;
      return matchesName && matchesStatus && matchesDate;
    });
  }

  viewProject(project: Project): void {
    // this.router.navigate(['/admin/projects', project.id]);
    this.viewDetail = true
    this.selectedProject = project.id
  }

  createNewProject(): void {
    // this.router.navigate(['/admin/projects/create']);
    this.openCreateForm = !this.openCreateForm
  }
}
