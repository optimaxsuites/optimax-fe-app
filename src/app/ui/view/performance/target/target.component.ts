import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

interface TargetGoal {
  goalName: string;
  employeeName: string;
  goalDescription: string;
  startDate: string;
  endDate: string;
  priority: string;
  assignedTo: string;
  targetMetrics: { name: string; completed: boolean }[];
  actualMetrics: string;
  progressStatus: string;
  user_id?: number;
  isTarget?: boolean;
  level: string[];
  evaluator: string[];
  userRole: string | undefined;
  pendingCount: number;
  inProgressCount: number;
  notCompletedCount: number;
  onHoldCount: number;
  completedCount: number;
}

@Component({
  selector: 'app-target',
  templateUrl: './target.component.html',
  styleUrls: ['./target.component.scss'],
  providers: [MessageService],
})
export class TargetComponent implements OnInit {
  goals: TargetGoal[] = [];
  filteredGoals: TargetGoal[] = [];
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

  selectedGoal: TargetGoal | null = null;
  openTargetForm: boolean = false;
  user_id?: number;
  userRole: 'admin' | 'user' = 'user';
  confirmationMessage: string | null = null;
  pendingCount: number = 0;
  inProgressCount: number = 0;
  notCompletedCount: number = 0;
  onHoldCount: number = 0;
  completedCount: number = 0;

  constructor(private router: Router, private messageService: MessageService) {
    this.userRole =
      (sessionStorage.getItem('userRole') as 'admin' | 'user') || 'user';
    this.user_id = sessionStorage.getItem('userid')
      ? Number(sessionStorage.getItem('userid'))
      : undefined;
  }

  ngOnInit() {
    this.loadGoals();
  }

  calculateScores(): void {
    this.pendingCount = this.getGoalsByStatus('Pending').length;
    this.inProgressCount = this.getGoalsByStatus('In Progress').length;
    this.notCompletedCount = this.getGoalsByStatus('Not Completed').length;
    this.onHoldCount = this.getGoalsByStatus('On Hold').length;
    this.completedCount = this.getGoalsByStatus('Completed').length;
  }

  loadGoals() {
    // Get both types of goals from localStorage
    const employeeGoals = JSON.parse(
      localStorage.getItem('employeeGoals') || '[]'
    );
    const targetGoals = JSON.parse(localStorage.getItem('targetGoals') || '[]');

    if (this.userRole === 'admin') {
      // Admin sees all goals
      this.goals = [...employeeGoals, ...targetGoals];
    } else {
      // Regular users only see their goals
      this.goals = [
        ...employeeGoals.filter(
          (goal: TargetGoal) => goal.user_id === this.user_id
        ),
        ...targetGoals.filter(
          (goal: TargetGoal) => goal.user_id === this.user_id
        ),
      ];
    }

    this.filteredGoals = [...this.goals];
    this.sortGoals();
  }

  sortGoals() {
    // Sort by user_id, then by progress status
    this.filteredGoals.sort((a, b) => {
      if (this.user_id && a.user_id && b.user_id) {
        return a.user_id - b.user_id;
      }

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
        goal.employeeName.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.selectedStatus.length === 0 ||
        this.selectedStatus.includes(goal.progressStatus);

      return matchesSearch && matchesStatus;
    });
  }

  getGoalsByStatus(status: string): TargetGoal[] {
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

  onStatusChange(goal: any, newStatus: string): void {
    // Update the status for the selected goal
    goal.progressStatus = newStatus;

    // Recalculate scores
    this.calculateScores();
  }

  viewGoal(goal: TargetGoal) {
    this.selectedGoal = goal;
    this.viewModalVisible = true;
  }

  editGoal(goal: TargetGoal) {
    console.log('Edit goal:', goal);
  }

  deleteGoal(goal: TargetGoal) {
    const confirmDelete = confirm('Are you sure you want to delete this goal?');

    if (confirmDelete) {
      // Remove from both storages to ensure it's deleted
      ['targetGoals', 'employeeGoals'].forEach((key) => {
        const goals = JSON.parse(localStorage.getItem(key) || '[]');
        const updatedGoals = goals.filter(
          (g: TargetGoal) =>
            g.goalName !== goal.goalName || g.user_id !== goal.user_id
        );
        localStorage.setItem(key, JSON.stringify(updatedGoals));
      });

      // Update the current view
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
    localStorage.setItem('employeeGoals', JSON.stringify(this.goals));
  }

  navigateToCreateGoal() {
    this.openTargetForm = !this.openTargetForm;
  }

  saveMetricsToLocalStorage(): void {
    if (this.selectedGoal) {
      localStorage.setItem(
        'targetMetrics',
        JSON.stringify(this.selectedGoal.targetMetrics)
      );
    }
  }

  loadMetricsFromLocalStorage(): void {
    const savedMetrics = localStorage.getItem('targetMetrics');
    if (savedMetrics && this.selectedGoal) {
      this.selectedGoal.targetMetrics = JSON.parse(savedMetrics);
    }
  }
}
