

import { Component, signal, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { DialogService } from 'primeng/dynamicdialog';
import { NewTaskComponent } from '../new-task/new-task.component';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

export interface Task {
  id: string;
  name: string;
  completed: boolean;
  projectId: string;
  selectedUsers?: string;
  status?: string;
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

interface CardHeader {
  cardOne?: string;
  cardTwo?: string;
  cardThree?: string;
  cardFour?: string;
}

@Component({
  selector: 'app-project-view',
  templateUrl: './project-view.component.html',
  styleUrls: ['./project-view.component.scss'],
  providers: [DialogService],
})
export class ProjectViewComponent implements OnInit {
  readonly panelOpenState = signal(false);
  project: Project | null = null;
  tasks: Task[] = [];
  @Input() text: string = '';
  @Input() emoji: string = '';

  cards = [
    [{ text: 'Not Started Task 1' }, { text: 'Not Started Task 2' }],
    [
      { text: 'In Progress Task 1' },
      { text: 'In Progress Task 2' },
      { text: 'In Progress Task 3' }
    ],
    [{ text: 'Completed Task 1' }],
    [{ text: 'Done Task 1' },{ text: 'Not Started Task 2' }]
  ];















   cardHeader: CardHeader[] = [
    { cardOne: 'Not Started' },
    { cardTwo: 'In Progress' },
    { cardThree: 'Completed' },
    { cardFour: 'Done' }
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
      this.loadTasksForProject(projectId);
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
      this.tasks = Object.values(allTasks).filter(
        (task) => task.projectId === projectId
      );
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
    this.router.navigate(
      ['admin/productivity/4032e3b6-ea0e-480f-9c98-bbe10d67cee2/project-list'],
      { replaceUrl: true }
    );
  }

  openTaskModal() {
    const ref = this.dialogService.open(NewTaskComponent, {
      data: { projectId: this.project?.id },
    });

    ref.onClose.subscribe((task: Task) => {
      if (task) {
        this.tasks.push(task);
        this.saveTaskToLocalStorage(task);
      }
    });
  }  
  
//   drop(event: CdkDragDrop<{ text: string }[]>) {
//   if (event.previousContainer === event.container) {
//     moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
//   } else {
   
//     transferArrayItem(
//       event.previousContainer.data,
//       event.container.data,
//       event.previousIndex,
//       event.currentIndex
//     );
//     const movedTask = event.container.data[event.currentIndex];
//     const targetListIndex = this.cards.indexOf(event.container.data);

//     const task = this.tasks.find((t) => t.name === movedTask.text);
//     if (task) {

//       const statusKey = `card${targetListIndex + 1}` as keyof CardHeader;
//       const status = this.cardHeader[targetListIndex][statusKey];
//       if (status) {
//         task.status = status;
//         this.saveTaskToLocalStorage(task);
//       }
//     }
//   }
// }

  
  
  
  
  
  
  
  
  
  
  drop(event: CdkDragDrop<any[]>) {
  if (event.previousContainer === event.container) {
    // Move within same list
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  } else {
    // Move between lists
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    // Update task status if needed
    const movedItem = event.container.data[event.currentIndex];
    const targetListIndex = this.cards.findIndex(list => list === event.container.data);
    
    if (movedItem.id) { // If it's a Task object
      const task = this.tasks.find(t => t.id === movedItem.id);
      if (task) {
        const statusKey = `card${targetListIndex + 1}` as keyof CardHeader;
        task.status = this.cardHeader[targetListIndex][statusKey];
        this.saveTaskToLocalStorage(task);
      }
    }
  }
}
}
