import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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
  progressStatus: string;
  user_id?: number;
  isTarget?: boolean;
  level: string;
  evaluator: string;
}

@Component({
  selector: 'app-target',
  templateUrl: './target.component.html',
  styleUrls: ['./target.component.scss'],
  providers: [MessageService],
})
export class TargetComponent implements OnInit {
  goalForm: FormGroup;
  targetGoals: TargetGoal[] = [];
  employeeGoals: TargetGoal[] = [];
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
  currentGoalId: number | null = null;
  selectedGoal: TargetGoal | null = null;
  openTargetForm: boolean = false;
  user_id?: number;
  userRole: string | undefined;
  confirmationMessage: string | null = null;
  pendingCount: number = 0;
  inProgressCount: number = 0;
  notCompletedCount: number = 0;
  onHoldCount: number = 0;
  completedCount: number = 0;
  opengoal: boolean = false;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private fb: FormBuilder
  ) {
    this.userRole = sessionStorage.getItem('role') || undefined;
    this.user_id = Number(sessionStorage.getItem('userid'));
    this.goalForm = this.fb.group({
      name: [''],
      description: [''],
      deadline: [''],
    });
  }

  ngOnInit() {
    this.loadGoals();

    window.addEventListener('storage', () => this.loadGoals());
  }

  calculateScores(): void {
    this.pendingCount = this.getGoalsByStatus('Pending').length;
    this.inProgressCount = this.getGoalsByStatus('In Progress').length;
    this.notCompletedCount = this.getGoalsByStatus('Not Achieved').length;
    this.onHoldCount = this.getGoalsByStatus('On Hold').length;
    this.completedCount = this.getGoalsByStatus('Completed').length;
  }

  loadAllTargets() {}

  loadGoals() {
    const savedTargetGoals = JSON.parse(
      localStorage.getItem('targetGoals') || '[]'
    );
    const savedEmployeeGoals = JSON.parse(
      localStorage.getItem('employeeGoals') || '[]'
    );

    // if (this.userRole === 'ROLE_ADMIN') {
    this.targetGoals = savedTargetGoals;
    this.employeeGoals = savedEmployeeGoals;
    // } else {
    //   this.targetGoals = savedTargetGoals.filter(
    //     (goal: TargetGoal) => goal.user_id === this.user_id
    //   );
    //   this.employeeGoals = savedEmployeeGoals.filter(
    //     (goal: TargetGoal) => goal.user_id === this.user_id
    //   );
    // }

    this.filteredGoals = [...this.targetGoals, ...this.employeeGoals];
    this.sortGoals();
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
    this.filteredGoals = [...this.targetGoals, ...this.employeeGoals].filter(
      (goal) => {
        const matchesSearch =
          goal.goalName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          goal.employeeName
            .toLowerCase()
            .includes(this.searchTerm.toLowerCase());
        const matchesStatus =
          this.selectedStatus.length === 0 ||
          this.selectedStatus.includes(goal.progressStatus);
        return matchesSearch && matchesStatus;
      }
    );
  }

  getGoalsByStatus(status: string): TargetGoal[] {
    return this.filteredGoals.filter((goal) => goal.progressStatus === status);
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

  onStatusChange(goal: TargetGoal, newStatus: string): void {
    goal.progressStatus = newStatus;
    this.calculateScores();
  }

  viewGoal(goal: TargetGoal) {
    this.selectedGoal = goal;
    this.viewModalVisible = true;
  }

  editGoal(goal: TargetGoal) {
    this.goalForm.patchValue({
      name: goal.goalName,
      description: goal.goalDescription,
      deadline: goal.endDate,
    });
    this.currentGoalId = goal.user_id ?? null;
  }

  deleteGoal(goal: TargetGoal) {
    const confirmDelete = confirm('Are you sure you want to delete this goal?');
    if (confirmDelete) {
      ['targetGoals', 'employeeGoals'].forEach((key) => {
        const goals = JSON.parse(localStorage.getItem(key) || '[]');
        const updatedGoals = goals.filter(
          (g: TargetGoal) =>
            g.goalName !== goal.goalName || g.user_id !== goal.user_id
        );
        localStorage.setItem(key, JSON.stringify(updatedGoals));
      });
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
    localStorage.setItem('employeeGoals', JSON.stringify(this.filteredGoals));
  }

  navigateToCreateGoal() {
    this.openTargetForm = !this.openTargetForm;
  }

  navigateCreateGoal() {
    this.opengoal = !this.opengoal;
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
