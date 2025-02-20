
import { Component, signal, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { DialogService } from 'primeng/dynamicdialog';
import { NewTaskComponent } from '../new-task/new-task.component';
// import { TabsModule } from 'primeng/tabs';

export interface Task {
  id: string;
  name: string;
  completed: boolean;
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
  tasks?: Task[];
}

@Component({
  selector: 'app-project-view',
  templateUrl: './project-view.component.html',
  styleUrls: ['./project-view.component.scss'],
  providers: [DialogService]
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

  constructor(private route: ActivatedRoute, private router: Router, private dialogService: DialogService) { }
  //
visible: boolean = false;

    showDialog() {
        this.visible = true;
    }
  //
  // 
  

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProjectDetails(projectId);
    }
  }

  loadProjectDetails(projectId: string): void {
    const storedData = localStorage.getItem('projectData');
    if (storedData) {
      const projects: Project[] = JSON.parse(storedData);
      this.project = projects.find((p) => p.id === projectId) || null;
      if (this.project) {
        this.tasks = this.project.tasks || [];
      }
    }
  }

  createTask(): void {
    if (this.project) {
      // const newTask: Task = { id: Date.now().toString(), name: '', completed: false };
      const newTask: Task = { id: Date.now().toString(), name: 'New Task', completed: false };
      this.tasks.push(newTask);
      this.project.tasks = this.tasks;
    }
  }

  goBack(): void {
    this.router.navigate(['admin/productivity/project-list']);
  }

  // Task Modale opening

   openTaskModal() {
    this.dialogService.open(NewTaskComponent, {
      // header: 'New Task',
      // height: '1200px',
      // width: '1000px',
      
      // modal: true
    });
  }
}
