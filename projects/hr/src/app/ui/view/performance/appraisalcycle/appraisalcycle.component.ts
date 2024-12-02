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

@Component({
  selector: 'app-appraisalcycle',
  templateUrl: './appraisalcycle.component.html',
  styleUrl: './appraisalcycle.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class AppraisalcycleComponent implements OnInit {
  departments: any[] = [];
  levels: any[] = [];

  questionListArray: AppraisalQuestionDTO[] = [];
  selectedAppraisal: AppraisalQuestionDTO | null = null;
  selectedDepartment: string | null = null;
  selectedLevel: string | null = null;
  users: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      department: 'IT',
      level: 'Mid Level 1',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      department: 'HR',
      level: 'Senior Level 1',
    },
  ];
  selectedUsers: User[] = [];
  instructionDisplayed: boolean = false;
  instructionText: string = '';

  constructor(
    private randomTokenService: RandomTokenService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private dataService: DataService
  ) {}

  ngOnInit() {
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
    this.loadQuestions();
    this.selectedAppraisal = this.getAppraisalFromStorage();
  }

  loadQuestions() {
    const savedQuestions = localStorage.getItem('appraisalQuestions');
    console.log(savedQuestions);
    if (savedQuestions) {
      this.questionListArray = JSON.parse(savedQuestions);
    }

    const instructionState = localStorage.getItem('instructionDisplayed');
    const savedInstructionText = localStorage.getItem('instructionText');
    if (instructionState === 'true' && savedInstructionText) {
      this.instructionDisplayed = true;
      this.instructionText = savedInstructionText;
    }
  }

  getSectionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getFilteredSidebarData() {
    if (this.selectedDepartment && this.selectedLevel) {
      return this.questionListArray.filter(
        (question) =>
          question.department === this.selectedDepartment &&
          question.level === this.selectedLevel
      );
    }
    return this.questionListArray;
  }

  view(department: string, level: string) {
    const existingQuestions = this.getQuestionsForDepartmentAndLevel(
      department,
      level
    );
    this.selectedAppraisal =
      existingQuestions.length > 0 ? existingQuestions[0] : null;
  }

  closeView() {
    this.selectedAppraisal = null;
  }

  getQuestionsForDepartmentAndLevel(
    department: string,
    level: string
  ): AppraisalQuestionDTO[] {
    return this.questionListArray.filter(
      (question) =>
        question.department === department && question.level === level
    );
  }

  sendAppraisal() {
    if (!this.selectedAppraisal || this.selectedUsers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Selection',
        detail: 'Please select an appraisal and users to send',
      });
      return;
    }
    const token = this.generateToken();
    this.selectedUsers.forEach((user) => {
      console.log(`Sending appraisal to ${user.name} with token ${token}`);
    });
    this.messageService.add({
      severity: 'success',
      summary: 'Appraisal Sent',
      detail: `Appraisal sent to ${this.selectedUsers.length} users`,
    });
  }

  getFilteredUsers(): User[] {
    if (!this.selectedAppraisal) return this.users;
    return this.users.filter(
      (user) =>
        user.department === this.selectedAppraisal?.department &&
        user.level === this.selectedAppraisal?.level
    );
  }

  generateToken(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getAppraisalFromStorage(): AppraisalQuestionDTO | null {
    const storedAppraisal = localStorage.getItem('selectedAppraisal');
    return storedAppraisal ? JSON.parse(storedAppraisal) : null;
  }

  filterDepartment() {
    if (this.selectedDepartment && this.selectedLevel) {
      this.view(this.selectedDepartment, this.selectedLevel);
    } else {
      this.selectedLevel = null;
    }
  }

  filterLevel() {
    if (this.selectedDepartment && this.selectedLevel) {
      this.view(this.selectedDepartment, this.selectedLevel);
    }
  }

  getDepartmentCounts() {
    return this.groupBy(this.questionListArray, 'department');
  }

  getLevelCounts() {
    return this.groupBy(this.questionListArray, 'level');
  }

  getStatusCounts() {
    return this.groupBy(this.questionListArray, 'status');
  }

  getDateCounts() {
    return this.groupBy(this.questionListArray, (q) =>
      new Date(q.createdDate).toDateString()
    );
  }

  groupBy(array: any[], key: string | ((item: any) => string)) {
    const map = new Map<string, number>();
    array.forEach((item) => {
      const keyValue = typeof key === 'function' ? key(item) : item[key];
      map.set(keyValue, (map.get(keyValue) || 0) + 1);
    });

    return Array.from(map, ([name, count]) => ({ name, count }));
  }
}
