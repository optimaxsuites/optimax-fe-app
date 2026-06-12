import { Component, OnInit } from '@angular/core';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DataService } from '../../../service/data.service';
import { TableColumn } from '../../../shared-component/view/table/table.component';

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
  dueDate: string;
  period: string;
  progressStatus: string;
  id: string;
  comment: string;
}

@Component({
  selector: 'app-goal',
  templateUrl: './goal.component.html',
  styleUrl: './goal.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class GoalComponent implements OnInit {
  departments: any[] = [];
  levels: any[] = [];

  appraisals: Appraisal[] = [];
  filteredAppraisals: Appraisal[] = [];

  selectedDepartment: string | null = null;
  selectedLevel: string | null = null;
  goalColumns: TableColumn[] = [
    { header: 'Employee Name', field: 'employeeName', sortable: true, className: 'table-item' },
    { header: 'Department', field: 'department', sortable: true, className: 'table-item' },
    { header: 'Level', field: 'level', sortable: true, className: 'table-item' },
    { header: 'Due Date', field: 'dueDate', sortable: true, className: 'table-item' },
    { header: 'Review Status', field: 'progressStatus', sortable: true, className: 'table-item' },
    { header: 'Action', className: 'table-item' },
  ];

  selectedAppraisal: Appraisal | null = null;
  comment: string = '';

  openAppraisal = false;
  userRole: string = 'ROLE_ADMIN';
  user_id: number | undefined;

  statuses: string[] = ['Pending', 'In Progress', 'Completed'];
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
      localStorage.getItem('employeeAppraisals') || '[]'
    );

    this.appraisals = storedAppraisals.map((appraisal: any) => ({
      employeeName: appraisal.employeeName,
      employeeId: appraisal.employeeId,
      department: appraisal.department,
      level: appraisal.level,
      startDate: appraisal.startDate,
      dueDate: appraisal.dueDate,
      period: appraisal.period,
      progressStatus: appraisal.progressStatus || 'Initiated',
      id: appraisal.id,
      comment: appraisal.comment || '',
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

  viewAppraisalDetails(appraisal: Appraisal) {
    this.selectedAppraisal = appraisal;
    this.openAppraisal = true;
  }

  submitAppraisalForApproval(appraisal: Appraisal) {
    // Update appraisal with comment and status
    const updatedAppraisal = {
      ...appraisal,
      comment: this.comment,
      progressStatus: 'Pending Approval',
    };

    // Update in localStorage
    const storedAppraisals = JSON.parse(
      localStorage.getItem('employeeAppraisals') || '[]'
    );
    const index = storedAppraisals.findIndex((a: any) => a.id === appraisal.id);

    if (index !== -1) {
      storedAppraisals[index] = updatedAppraisal;
    } else {
      storedAppraisals.push(updatedAppraisal);
    }

    localStorage.setItem(
      'employeeAppraisals',
      JSON.stringify(storedAppraisals)
    );

    // Notify user of success
    this.messageService.add({
      severity: 'success',
      summary: 'Appraisal Submitted',
      detail: `Appraisal for ${appraisal.employeeName} submitted for approval.`,
      life: 3000,
    });

    this.openAppraisal = false;
    this.comment = ''; // Clear the comment field
    this.loadAppraisals(); // Reload the updated appraisals
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
