// goal.component.ts
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
}

@Component({
  selector: 'app-goal',
  templateUrl: './goal.component.html',
  styleUrls: ['./goal.component.scss'],
  providers: [MessageService],
})
export class GoalComponent implements OnInit {
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
  openAddGoal: boolean = false;
  confirmationMessage: string | null = null;
  user_id: number | undefined;

  constructor(private router: Router, private messageService: MessageService) {}

  ngOnInit() {
    this.loadGoals();
    this.loadMetricsFromLocalStorage();

    this.user_id = sessionStorage.getItem('userid')
      ? Number(sessionStorage.getItem('userid'))
      : undefined;
  }

  loadGoals() {
    const savedGoals = localStorage.getItem('employeeGoals');
    if (savedGoals) {
      console.log('Loaded Goals:', savedGoals);
      this.goals = JSON.parse(savedGoals).filter(
        (goal: TargetGoal) => !goal.isTarget
      );
      this.filteredGoals = [...this.goals];
      this.sortGoals();
    }
  }

  sortGoals() {
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
        goal.assignedTo.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus =
        this.selectedStatus.length === 0 ||
        this.selectedStatus.includes(goal.progressStatus);
      return matchesSearch && matchesStatus;
    });
    this.sortGoals();
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

  viewGoal(goal: TargetGoal) {
    this.selectedGoal = goal;
    this.viewModalVisible = true;
  }

  editGoal(goal: TargetGoal) {
    console.log('Edit goal:', goal);
  }

  deleteGoal(goal: TargetGoal) {
    // Only delete from employeeGoals
    const employeeGoals = JSON.parse(
      localStorage.getItem('employeeGoals') || '[]'
    );
    const updatedGoals = employeeGoals.filter(
      (g: TargetGoal) =>
        !(g.goalName === goal.goalName && g.user_id === goal.user_id)
    );
    localStorage.setItem('employeeGoals', JSON.stringify(updatedGoals));

    // Only update the local arrays for this component
    this.goals = updatedGoals;
    this.filteredGoals = this.goals;

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Goal deleted successfully',
      life: 3000,
    });
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
    this.openAddGoal = !this.openAddGoal;
  }

  saveMetricsToLocalStorage(): void {
    if (this.selectedGoal) {
      localStorage.setItem(
        'targetMetrics',
        JSON.stringify(this.selectedGoal.targetMetrics)
      );
    }
  }

  toggleAddGoal() {
    this.openAddGoal = !this.openAddGoal;
  }

  loadMetricsFromLocalStorage(): void {
    const savedMetrics = localStorage.getItem('targetMetrics');
    if (savedMetrics && this.selectedGoal) {
      this.selectedGoal.targetMetrics = JSON.parse(savedMetrics);
    }
  }
}
