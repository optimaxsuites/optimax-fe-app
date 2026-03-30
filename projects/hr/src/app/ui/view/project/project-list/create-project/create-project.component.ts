import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Project, ProjectService, Task } from '../../../../service/project.service';

@Component({
  selector: 'app-create-project',
  templateUrl: './create-project.component.html',
  styleUrl: './create-project.component.scss'
})
export class CreateProjectComponent {
  newProject: Partial<Project> = {
    status: 'Pending',
    tasks: [],
    notes: [],
    assignedTo: []
  };

  newTask: Partial<Task> = {};
  assignedMembers = '';

  constructor(
    private projectService: ProjectService,
    private messageService: MessageService
  ) {}

  addTask() {
    if (!this.newTask.title) return;

    const task: Task = {
      id: Date.now(),
      title: this.newTask.title!,
      description: this.newTask.description || '',
      completed: false,
      milestone: this.newTask.milestone || false,
    };

    this.newProject.tasks?.push(task);
    this.newTask = {};
  }

  removeTask(taskId: number) {
    this.newProject.tasks = this.newProject.tasks?.filter(t => t.id !== taskId);
  }

  createProject() {
    if (!this.newProject.name || !this.newProject.description) return;

    const project: Project = {
      id: 0,
      name: this.newProject.name!,
      description: this.newProject.description!,
      status: this.newProject.status as any,
      startDate: this.newProject.startDate!,
      endDate: this.newProject.endDate!,
      assignedTo: this.assignedMembers
        ? this.assignedMembers.split(',').map(a => a.trim())
        : [],
      tasks: this.newProject.tasks || [],
      notes: [],
    };

    this.projectService.addProject(project);
    this.messageService.add({
      severity: 'success',
      summary: 'Project Created',
      detail: `${project.name} has been added successfully.`,
      life: 3000,
    });

    this.newProject = { status: 'Pending', tasks: [], notes: [] };
    this.assignedMembers = '';
  }
}
