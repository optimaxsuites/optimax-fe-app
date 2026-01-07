import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Project, ProjectService } from '../../../../service/project.service';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss'
})
export class ProjectDetailComponent implements OnInit{
  @Input() selectedProjectId: number = 0
  project?: Project;
  taskCompletionRate = 0;

  constructor(private route: ActivatedRoute, private projectService: ProjectService) {}

  ngOnInit(): void {
    // const id = Number(this.route.snapshot.paramMap.get('id'));
    this.project = this.projectService.getProjectById(this.selectedProjectId);
    this.calculateStats();
  }

  calculateStats(): void {
    if (!this.project) return;
    const total = this.project.tasks.length;
    const done = this.project.tasks.filter(t => t.completed).length;
    this.taskCompletionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  }
}
