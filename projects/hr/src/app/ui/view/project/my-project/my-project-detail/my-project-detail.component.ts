import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Project, ProjectService } from '../../../../service/project.service';

@Component({
  selector: 'app-my-project-detail',
  templateUrl: './my-project-detail.component.html',
  styleUrl: './my-project-detail.component.scss'
})
export class MyProjectDetailComponent {
  @Input() selectedProjectId: number = 0
  project?: Project;
  newTask = '';
  newNote = '';
  currentUser = 'Rolayo Awe';

  constructor(private route: ActivatedRoute, private projectService: ProjectService) {}

  ngOnInit(): void {
    this.project = this.projectService.getProjectById(this.selectedProjectId);
  }

  toggleTask(taskId: number) {
    if (!this.project) return;
    this.projectService.toggleTaskCompletion(this.project.id, taskId);
  }

  addTask() {
    if (!this.newTask.trim() || !this.project) return;
    const newTaskObj = {
      id: Date.now(),
      title: this.newTask,
      description: '',
      completed: false,
    };
    this.projectService.addTaskToProject(this.project.id, newTaskObj);
    this.newTask = '';
  }

  addNote() {
    if (!this.newNote.trim() || !this.project) return;
    this.projectService.addNote(this.project.id, this.currentUser, this.newNote);
    this.newNote = '';
  }
}
