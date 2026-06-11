import { Injectable } from '@angular/core';

export interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  milestone?: boolean;
  
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: 'Ongoing' | 'Completed' | 'Pending';
  startDate: string;
  endDate: string;
  assignedTo: string[]; // employee names or IDs
  tasks: Task[];
  notes: { user: string; message: string; date: string }[];
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private projects: Project[] = [
    {
      id: 1,
      name: 'iTeleStream Upgrade',
      description: 'Upgrade the streaming module with analytics and better UI.',
      status: 'Ongoing',
      startDate: '2025-10-01',
      endDate: '2025-11-15',
      assignedTo: ['John Doe', 'Mary Smith'],
      tasks: [
        { id: 1, title: 'UI Redesign', description: 'Revamp dashboard UI', completed: true },
        { id: 2, title: 'Add Analytics', description: 'Implement viewer stats', completed: false, milestone: true },
        { id: 3, title: 'Optimize API', description: 'Reduce latency by 20%', completed: false },
      ],
      notes: [
        { user: 'John Doe', message: 'Completed initial UI screens', date: '2025-10-10' },
      ]
    },
    {
      id: 2,
      name: 'CivicLens Dashboard',
      description: 'Admin dashboard for analyzing public sentiment data.',
      status: 'Pending',
      startDate: '2025-11-05',
      endDate: '2026-01-30',
      assignedTo: ['Mary Smith', 'Tunde Ola'],
      tasks: [
        { id: 1, title: 'Setup Backend API', description: 'Prepare endpoints', completed: false },
        { id: 2, title: 'UI Wireframes', description: 'Low fidelity mockups', completed: false },
      ],
      notes: []
    }
  ];

  getProjects(): Project[] {
    return this.projects;
  }

  getProjectById(id: number): Project | undefined {
    return this.projects.find(p => p.id === id);
  }

  getProjectsForUser(username: string): Project[] {
    return this.projects.filter(p => p.assignedTo.includes(username));
  }
  
  addTaskToProject(projectId: number, task: Task) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) project.tasks.push(task);
  }
  
  toggleTaskCompletion(projectId: number, taskId: number) {
    const project = this.projects.find(p => p.id === projectId);
    const task = project?.tasks.find(t => t.id === taskId);
    if (task) task.completed = !task.completed;
  }
  
  addNote(projectId: number, user: string, message: string) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      project.notes?.push({
        user,
        message,
        date: new Date().toISOString().split('T')[0],
      });
    }
  }

  addProject(project: Project) {
    project.id = Date.now();
    this.projects.push(project);
  }
  
  updateProjectStatus(projectId: number, status: 'Ongoing' | 'Completed' | 'Pending') {
    const project = this.projects.find(p => p.id === projectId);
    if (project) project.status = status;
  }
  
  filterProjects(term: string, status?: string): Project[] {
    return this.projects.filter(p => {
      const matchesTerm =
        p.name.toLowerCase().includes(term.toLowerCase()) ||
        p.description.toLowerCase().includes(term.toLowerCase());
  
      const matchesStatus = status ? p.status === status : true;
      return matchesTerm && matchesStatus;
    });
  }
  
}
