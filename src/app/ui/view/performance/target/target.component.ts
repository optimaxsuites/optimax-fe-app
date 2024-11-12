import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

interface Goal {
  goalName: string;
  employeeName: string;
  goalDescription: string;
  startDate: string;
  endDate: string;
  priority: string;
  assignedTo: string;
  targetMetrics: { name: string; completed: boolean }[];
  progressStatus: string;
}

@Component({
  selector: 'app-target',
  templateUrl: './target.component.html',
  styleUrl: './target.component.scss',
  providers: [MessageService],
})
export class TargetComponent implements OnInit {
  goals: Goal[] = [];
  filteredGoals: Goal[] = [];
  selectedStatus: string[] = [];
  searchTerm: string = '';
  statusOptions: string[] = [
    'Pending',
    'In Progress',
    'Not Achieved',
    'On Hold',
    'Completed',
  ];

  viewModalVisible: boolean = false;
  selectedGoal: Goal | null = null;
  openTargetForm: boolean = false;
  confirmationMessage: string | null = null;

  constructor(private router: Router, private messageService: MessageService) {}

  ngOnInit() {
    this.loadGoals();
    this.loadMetricsFromLocalStorage();
  }

  loadGoals() {
    const savedGoals = localStorage.getItem('goals');
    if (savedGoals) {
      this.goals = JSON.parse(savedGoals);
      this.filteredGoals = [...this.goals];
      this.sortGoals();
    }
  }

  sortGoals() {
    this.filteredGoals.sort((a, b) => {
      const statusOrder = {
        Pending: 0,
        'In Progress': 1,
        'Not Achieved': 2,
        'On Hold': 3,
        Completed: 4,
      };
      return (
        statusOrder[a.progressStatus as keyof typeof statusOrder] -
        statusOrder[b.progressStatus as keyof typeof statusOrder]
      );
    });
  }

  filterGoals() {
    this.filteredGoals = this.goals.filter((goal) => {
      const matchesSearch =
        goal.goalName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        goal.assignedTo.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus =
        this.selectedStatus.length === 0 ||
        this.selectedStatus.includes(goal.progressStatus);
      return matchesSearch && matchesStatus;
    });
    this.sortGoals();
  }

  getGoalsByStatus(status: string): Goal[] {
    return this.goals.filter((goal) => goal.progressStatus === status);
  }

  getPriorityBadgeClass(priority: string): string {
    const baseClasses = 'px-2 py-1 rounded-full text-lg font-semibold';
    switch (priority.toLowerCase()) {
      case 'high':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return baseClasses;
    }
  }

  getStatusBadgeClass(status: string): string {
    const baseClasses = 'px-2 py-1 rounded-full text-lg font-semibold';
    switch (status.toLowerCase()) {
      case 'pending':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'in progress':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'not achieved':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'on hold':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return baseClasses;
    }
  }

  viewGoal(goal: Goal) {
    this.selectedGoal = goal;
    this.viewModalVisible = true;
  }

  editGoal(goal: Goal) {
    console.log('Edit goal:', goal);
  }

  deleteGoal(goal: Goal) {
    const index = this.goals.findIndex((g) => g === goal);
    if (index > -1) {
      this.goals.splice(index, 1);
      localStorage.setItem('goals', JSON.stringify(this.goals));
      this.loadGoals();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Goal deleted successfully',
        life: 3000,
      });
    }
  }

  toggleMetricCompletion(metric: { name: string; completed: boolean }) {
    if (!metric.completed) {
      metric.completed = true;

      this.confirmationMessage = `Task "${metric.name}" completed successfully!`;

      setTimeout(() => {
        this.confirmationMessage = null;
      }, 2000);
    }
    localStorage.setItem('goals', JSON.stringify(this.goals));
  }

  navigateToCreateGoal() {
    this.openTargetForm = !this.openTargetForm;
  }

  // Save metrics to localStorage
  saveMetricsToLocalStorage(): void {
    if (this.selectedGoal) {
      localStorage.setItem(
        'targetMetrics',
        JSON.stringify(this.selectedGoal.targetMetrics)
      );
    }
  }

  // Load metrics from localStorage
  loadMetricsFromLocalStorage(): void {
    const savedMetrics = localStorage.getItem('targetMetrics');
    if (savedMetrics && this.selectedGoal) {
      this.selectedGoal.targetMetrics = JSON.parse(savedMetrics);
    }
  }
}
