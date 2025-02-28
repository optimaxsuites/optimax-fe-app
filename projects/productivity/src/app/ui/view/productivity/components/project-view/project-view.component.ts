
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
  createdAt: Date;
  timeLine: Date;
  tasks?: Task[];
}

@Component({
  selector: 'app-project-view',
  templateUrl: './project-view.component.html',
  styleUrls: ['./project-view.component.scss'],
  // providers: [DialogService]
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
    
  ]

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











































// import { Component, OnInit } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';
// import { DialogService } from 'primeng/dynamicdialog';
// import { NewTaskComponent } from '../new-task/new-task.component';

// export interface Task {
//   id: string;
//   name: string;
//   completed: boolean;
// }

// export interface Project {
//   id: string;
//   name: string;
//   shortName?: string;
//   projectImage: string;
//   accuracyPercentage?: number;
//   completionRate?: number;
//   priority: 'high' | 'medium' | 'low';
//   taskWorkers?: string[];
//   lastEdited: Date;
//   createdAt: Date;
//   timeLine: Date;
//   tasks?: Task[];
// }

// @Component({
//   selector: 'app-project-view',
//   templateUrl: './project-view.component.html',
//   styleUrls: ['./project-view.component.scss'],
//   providers: [DialogService]
// })
// export class ProjectViewComponent implements OnInit {
//   project: Project | null = null;
//   tasks: Task[] = [];

//   constructor(private route: ActivatedRoute, private router: Router, private dialogService: DialogService) {
//     // visible: boolean = false;

//     // this.openTaskModal() {
//     //     this.visible = true;
//     // }
//   }

//   ngOnInit(): void {
//     const projectId = this.route.snapshot.paramMap.get('id');
//     if (projectId) {
//       this.loadProjectDetails(projectId);
//     }
//   }

//   loadProjectDetails(projectId: string): void {
//     const storedData = localStorage.getItem('projectData');
//     if (storedData) {
//       const projects: Project[] = JSON.parse(storedData);
//       this.project = projects.find((p) => p.id === projectId) || null;
//       if (this.project) {
//         this.tasks = this.project.tasks || [];
//       }
//     }
//   }

//   openTaskModal(): void {
//     const ref = this.dialogService.open(NewTaskComponent, {
//       header: 'Create New Task',
//       width: '450px'
//     });

//     ref.onClose.subscribe((task) => {
//       if (task) {
//         this.addTaskToProject(task);
//       }
//     });
//   }

//   addTaskToProject(task: any): void {
//     if (this.project) {
//       const newTask: Task = {
//         id: Date.now().toString(),
//         name: task.name,
//         completed: false
//       };

//       this.tasks.push(newTask);
//       this.project.tasks = this.tasks;

//       // Save updated project data to local storage
//       const storedData = localStorage.getItem('projectData');
//       if (storedData) {
//         const projects: Project[] = JSON.parse(storedData);
//         const updatedProjects = projects.map((p) =>
//           p.id === this.project?.id ? this.project : p
//         );
//         localStorage.setItem('projectData', JSON.stringify(updatedProjects));
//       }
//     }
//   }

//   goBack(): void {
//     this.router.navigate(['admin/productivity/project-list']);
//   }
// }