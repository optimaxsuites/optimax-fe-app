

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NewTaskComponent } from '../new-task/new-task.component';


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
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  timeline: {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
}

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
})
export class ProjectListComponent implements OnInit {
  panelOpenState = false;
  projects: Project[] = [];

  constructor(private router: Router, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    const storedData = localStorage.getItem('projectData');
    if (storedData) {
      try {
        const parsedProjects = JSON.parse(storedData);
        if (Array.isArray(parsedProjects)) {
          this.projects = parsedProjects.map((project: any): Project => {
            const startDate = project.startDate
              ? new Date(project.startDate)
              : new Date();
            const endDate = project.endDate
              ? new Date(project.endDate)
              : new Date();
            const createdAt = project.createdAt
              ? new Date(project.createdAt)
              : new Date();
            return {
              id: project.id || '',
              name: project.name || 'Unnamed Project',
              shortName: project.shortName || 'N/A',
              projectImage: project.projectImage || 'assets/default-image.png',
              accuracyPercentage: project.accuracyPercentage || 0,
              completionRate: project.completionRate || 0,
              priority: project.priority || 'low',
              taskWorkers: project.taskWorkers || [],
              lastEdited: project.lastEdited
                ? new Date(project.lastEdited)
                : new Date(),
              startDate,
              endDate,
              createdAt,

              timeline: {
                years: Math.floor(
                  (endDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24 * 365)
                ),
                months: Math.floor(
                  ((endDate.getTime() - startDate.getTime()) %
                    (1000 * 60 * 60 * 24 * 365)) /
                    (1000 * 60 * 60 * 24 * 30)
                ),
                days: Math.floor(
                  ((endDate.getTime() - startDate.getTime()) %
                    (1000 * 60 * 60 * 24 * 30)) /
                    (1000 * 60 * 60 * 24)
                ),
                hours: Math.floor(
                  ((endDate.getTime() - startDate.getTime()) %
                    (1000 * 60 * 60 * 24)) /
                    (1000 * 60 * 60)
                ),
                minutes: Math.floor(
                  ((endDate.getTime() - startDate.getTime()) %
                    (1000 * 60 * 60)) /
                    (1000 * 60)
                ),
                seconds: Math.floor(
                  ((endDate.getTime() - startDate.getTime()) % (1000 * 60)) /
                    1000
                ),
              },
            };
          });
        } else {
          console.error('Invalid project data format');
        }
      } catch (error) {
        console.error('Error parsing project data:', error);
      }
    }
  }

  getPriorityClass(priority: 'high' | 'medium' | 'low'): string {
    return (
      {
        high: 'text-red-500',
        medium: 'text-yellow-500',
        low: 'text-green-500',
      }[priority] || ''
    );
  }

  formatDate(date: Date): string {
    return date ? new Date(date).toLocaleDateString() : 'N/A';
  }

  onCreateProjectClick(): void {
    this.router.navigate(['admin/productivity/4032e3b6-ea0e-480f-9c98-bbe10d67cee2/project']);
  }

  onViewClick(project: Project): void {
    this.router.navigate(['admin/productivity/4032e3b6-ea0e-480f-9c98-bbe10d67cee2/project-view', project.id]);
  }

  onNewTaskClick(): void {
    this.dialog.open(NewTaskComponent, { width: '600px', disableClose: false });
  }

  progressValue = 50;

  updateProgress(value: number): void {
    if (value >= 0 && value <= 100) {
      this.progressValue = value;
    }
  }
}
