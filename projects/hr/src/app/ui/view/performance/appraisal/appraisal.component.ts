import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { DataService } from '../../../service/data.service';
import { EmployeeService } from '../../../service/employee.service';

interface Section {
  id: string;
  sectionTitle: string;
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  answer?: string;
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

@Component({
  selector: 'app-appraisal',
  templateUrl: './appraisal.component.html',
  styleUrls: ['./appraisal.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class AppraisalComponent implements OnInit {
  appraisalForm!: FormGroup;
  employees: User[] = [];
  departments: any[] = [];
  levels: any[] = [];

  @Output() back = new EventEmitter<void>();

  questionListArray: AppraisalQuestionDTO[] = [];
  selectedAppraisal: AppraisalQuestionDTO | null = null;
  selectedDepartment: string | null = null;
  selectedLevel: string | null = null;
  selectedEmployee: User | null = null;

  isAppraisalVisible: boolean = false;

  assessmentCycles: string[] = [
    'Annual Review For All 2024',
    'Annual Review By HR Department 2024',
    'Annual Assessment 2025',
    'Annual Review For All 2025',
    'Annual Review By HR Department 2025',
  ];

  periods: string[] = [
    'Annual Review',
    'Quarterly Review',
    'Performance Improvement',
  ];

  constructor(
    private fb: FormBuilder,
    private randomTokenService: RandomTokenService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private dataService: DataService,
    private employeeService: EmployeeService
  ) {
    this.initForm();
  }

  initForm() {
    this.appraisalForm = this.fb.group({
      employeeName: ['', Validators.required],
      assessment: ['', Validators.required],
      period: ['', Validators.required],
      reviewStatus: ['', Validators.required],
      dueDate: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadInitialData();
    this.loadQuestions();
  }

  loadInitialData() {
    this.dataService.getDepartment().subscribe({
      next: (data) => {
        this.departments = data;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load departments',
        });
      },
    });

    this.dataService.getAllLevels().subscribe({
      next: (data) => {
        this.levels = data;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load levels',
        });
      },
    });

    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        this.employees = data;
      },
      error: (err) => {
        console.log(err);
      },
    });

    this.appraisalForm
      .get('employeeName')
      ?.valueChanges.subscribe((employeeId) => {
        if (employeeId) {
          this.onEmployeeSelect(employeeId);
        }
      });
  }

  loadQuestions() {
    const savedQuestions = localStorage.getItem('appraisalQuestions');
    if (savedQuestions) {
      this.questionListArray = JSON.parse(savedQuestions);
    }
  }

  onEmployeeSelect(employeeId: string) {
    this.selectedEmployee =
      this.employees.find((emp) => emp.id === employeeId) || null;

    if (this.selectedEmployee) {
      this.selectedDepartment = this.selectedEmployee.department;
      this.selectedLevel = this.selectedEmployee.level;

      this.filterAppraisal();
    }
  }

  filterAppraisal() {
    if (this.selectedDepartment && this.selectedLevel) {
      const matchedAppraisals = this.questionListArray.filter(
        (appraisal) =>
          appraisal.department === this.selectedDepartment &&
          appraisal.level === this.selectedLevel
      );

      if (matchedAppraisals.length > 0) {
        this.selectedAppraisal = matchedAppraisals[0];

        this.appraisalForm.patchValue({
          department: this.selectedDepartment,
          level: this.selectedLevel,
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Appraisal Found',
          detail:
            'No appraisal questions found for selected department and level',
        });
        this.selectedAppraisal = null;
      }
    }
  }

  sendAppraisal() {
    if (this.appraisalForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Incomplete Form',
        detail: 'Please fill out all required fields',
      });
      return;
    }

    if (!this.selectedAppraisal) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Appraisal Selected',
        detail: 'Please select a department and level',
      });
      return;
    }

    const token = this.generateToken();
    const appraisalData = {
      ...this.appraisalForm.value,
      appraisalQuestions: this.selectedAppraisal,
      token: token,
      employeeId: this.selectedEmployee?.id,
      employeeName: this.selectedEmployee?.name,
    };

    let employeeAppraisals = JSON.parse(
      localStorage.getItem('employeeAppraisals') || '[]'
    );
    employeeAppraisals.push(appraisalData);
    localStorage.setItem(
      'employeeAppraisals',
      JSON.stringify(employeeAppraisals)
    );

    let adminAppraisals = JSON.parse(
      localStorage.getItem('adminAppraisals') || '[]'
    );
    adminAppraisals.push(appraisalData);
    localStorage.setItem('adminAppraisals', JSON.stringify(adminAppraisals));

    this.messageService.add({
      severity: 'success',
      summary: 'Appraisal Sent',
      detail: `Appraisal sent to ${this.selectedEmployee?.name} and recorded in the admin's table.`,
    });

    this.isAppraisalVisible = true;
  }

  generateToken(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getSectionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  saveAnswers() {
    if (!this.selectedAppraisal) return;

    const answeredAppraisal = {
      ...this.selectedAppraisal,
      sections: this.selectedAppraisal.sections.map((section) => ({
        ...section,
        questions: section.questions.map((q) => ({
          ...q,
          answer: q.answer || '',
        })),
      })),
    };

    // Here you would typically send the answered appraisal to your backend
    console.log('Saving answers:', answeredAppraisal);

    this.messageService.add({
      severity: 'success',
      summary: 'Answers Saved',
      detail: 'Your appraisal answers have been saved',
    });
  }

  goBack() {
    this.back.emit();
  }
}
