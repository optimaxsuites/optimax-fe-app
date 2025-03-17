

// Monday


import { Component, signal, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { DialogService } from 'primeng/dynamicdialog';
import { NewTaskComponent } from '../new-task/new-task.component';

export interface Task {
  id: string;
  name: string;
  completed: boolean;
  projectId: string; // Link the task to a project
  selectedUsers?: string; // Add selectedUser to the Task interface
  status?:string,
}

export interface Project {
  id: string;
  name: string;
  shortName?: string;
  projectImage: string;
  accuracyPercentage?: number;
  completionRate?: number;
  priority: 'high' | 'medium' | 'low';
  taskWorkers?: string[];
  lastEdited: Date;
  createdAt: Date;
  timeLine: Date;
  tasks?: Task[];
}

@Component({
  selector: 'app-project-view',
  templateUrl: './project-view.component.html',
  styleUrls: ['./project-view.component.scss'],
  providers: [DialogService], // Ensure DialogService is provided
})
export class ProjectViewComponent implements OnInit {
  readonly panelOpenState = signal(false);
  project: Project | null = null;
  tasks: Task[] = [];
  @Input() text: string = '';
  @Input() emoji: string = '';

  cards = [
    { text: 'This is a card! Select it to see its card back.', emoji: '👋' },
    { text: 'Hold and drag to move this card to another list', emoji: '👉' },
    { text: 'Invite collaborators to your board by selecting the menu to the right of the notifications bell.', emoji: '' }
  ];

  notStartedCard = [
    { text: "" },
    { text: "" },
    { text: "" },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialogService: DialogService
  ) {}

  visible: boolean = false;

  showDialog() {
    this.visible = true;
  }

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProjectDetails(projectId);
      this.loadTasksForProject(projectId); // Load tasks for the project
    }
  }

  loadProjectDetails(projectId: string): void {
    const storedData = localStorage.getItem('projectData');
    if (storedData) {
      const projects: Project[] = JSON.parse(storedData);
      this.project = projects.find((p) => p.id === projectId) || null;
    }
  }

  loadTasksForProject(projectId: string): void {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      const allTasks: { [key: string]: Task } = JSON.parse(storedTasks);
      this.tasks = Object.values(allTasks).filter((task) => task.projectId === projectId);
    }
  }

  createTask(): void {
    if (this.project) {
      const newTask: Task = {
        id: Date.now().toString(),
        name: 'New Task',
        completed: false,
        projectId: this.project.id,
      };
      this.tasks.push(newTask);
      this.saveTaskToLocalStorage(newTask);
    }
  }

  saveTaskToLocalStorage(task: Task): void {
    try {
      let tasks = JSON.parse(localStorage.getItem('tasks') || '{}');
      tasks[task.id] = task;
      localStorage.setItem('tasks', JSON.stringify(tasks));

      // Also, update the project's tasks in localStorage
      const storedData = localStorage.getItem('projectData');
      if (storedData) {
        const projects: Project[] = JSON.parse(storedData);
        const project = projects.find((p) => p.id === task.projectId);
        if (project) {
          if (!project.tasks) {
            project.tasks = [];
          }
          project.tasks.push(task);
          localStorage.setItem('projectData', JSON.stringify(projects));
        }
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  }

  goBack(): void {
    this.router.navigate(['admin/productivity/project-list']);
  }

  openTaskModal() {
    const ref = this.dialogService.open(NewTaskComponent, {
      data: { projectId: this.project?.id }, // Pass projectId to the modal
    });

    ref.onClose.subscribe((task: Task) => {
      if (task) {
        this.tasks.push(task);
        this.saveTaskToLocalStorage(task);
      }
    });
  }
}