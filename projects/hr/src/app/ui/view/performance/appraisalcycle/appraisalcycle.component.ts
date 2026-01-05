import { Component, OnInit } from '@angular/core';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DataService } from '../../../service/data.service';

interface Section {
  id: string;
  sectionTitle: string;
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
}

interface AppraisalQuestionDTO {
  id: string;
  department: string;
  level: string;
  sections: Section[];
  instructionText: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  level: string;
}

interface Appraisal {
  employeeName: string;
  employeeId: string;
  department: string;
  level: string;
  startDate: string;
  dueDate: string;
  period: string;
  progressStatus: string;
  id: string;
}

@Component({
  selector: 'app-appraisalcycle',
  templateUrl: './appraisalcycle.component.html',
  styleUrl: './appraisalcycle.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class AppraisalcycleComponent implements OnInit {
  departments: any[] = [];
  levels: any[] = [];

  appraisals: Appraisal[] = [];
  filteredAppraisals: Appraisal[] = [];

  selectedDepartment: string | null = null;
  selectedLevel: string | null = null;

  openAppraisal = false;
  userRole: string = 'ROLE_ADMIN';
  user_id: number | undefined;

  reviewStatus: string[] = ['Pending', 'In Progress', 'Completed'];
  templates: string[] = [
    'Annual Review',
    'Quarterly Review',
    'Performance Improvement',
  ];

  constructor(
    private messageService: MessageService,
    private dataService: DataService
  ) {}

  ngOnInit() {
    this.loadDepartmentsAndLevels();
    this.loadAppraisals();
  }

  loadDepartmentsAndLevels() {
    this.dataService.getDepartment().subscribe({
      next: (data) => {
        this.departments = data;
      },
      error: (err) => {
        console.log(err);
      },
    });

    this.dataService.getAllLevels().subscribe({
      next: (data) => {
        this.levels = data;
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  loadAppraisals() {
    const storedAppraisals = JSON.parse(
      localStorage.getItem('adminAppraisals') || '[]'
    );

    this.appraisals = storedAppraisals.map((appraisal: any) => ({
      employeeName: appraisal.employeeName,
      employeeId: appraisal.employeeId,
      department: appraisal.department,
      level: appraisal.department,
      reviewStatus: appraisal.reviewStatus,
      dueDate: appraisal.dueDate,
      period: appraisal.period,
      progressStatus: 'Initiated',
      id: appraisal.token,
    }));

    this.filteredAppraisals = [...this.appraisals];
  }

  navigateToCreate() {
    this.openAppraisal = !this.openAppraisal;
  }

  filterAppraisals() {
    this.filteredAppraisals = this.appraisals.filter((appraisal) => {
      const matchesDepartment =
        !this.selectedDepartment ||
        appraisal.department === this.selectedDepartment;

      const matchesLevel =
        !this.selectedLevel || appraisal.level === this.selectedLevel;

      return matchesDepartment && matchesLevel;
    });
  }

  filterDepartment() {
    this.filterAppraisals();
  }

  filterLevel() {
    this.filterAppraisals();
  }

  updateAppraisalStatus(appraisalId: string, newStatus: string) {
    const index = this.appraisals.findIndex((a) => a.id === appraisalId);

    if (index !== -1) {
      this.appraisals[index].progressStatus = newStatus;
      this.filteredAppraisals[index].progressStatus = newStatus;

      this.messageService.add({
        severity: 'success',
        summary: 'Status Updated',
        detail: `Appraisal status has been updated to ${newStatus}`,
        key: 'tl',
        life: 3000,
      });
    }
  }

  viewAppraisalDetails(appraisal: Appraisal) {
    console.log('View appraisal details:', appraisal);
  }

  editAppraisal(appraisal: Appraisal) {
    if (this.userRole === 'ROLE_ADMIN') {
      console.log('Edit appraisal:', appraisal);
    }
  }

  deleteAppraisal(appraisalId: string) {
    if (this.userRole === 'ROLE_ADMIN') {
      const index = this.appraisals.findIndex((a) => a.id === appraisalId);

      if (index !== -1) {
        this.appraisals.splice(index, 1);
        this.filteredAppraisals = [...this.appraisals];

        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: `Appraisal ID ${appraisalId} deleted successfully`,
        });
      }
    }
  }

  filterByStatus(status: string) {
    this.filteredAppraisals = this.appraisals.filter(
      (appraisal) => appraisal.progressStatus === status
    );
  }
}
