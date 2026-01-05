import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-appraisallist',
  templateUrl: './appraisallist.component.html',
  styleUrl: './appraisallist.component.scss',
  providers: [MessageService],
})
export class AppraisallistComponent implements OnInit {
  appraisals: any[] = [];
  filteredAppraisals: any[] = [];
  openAppraisalForm = false;
  userRole: string = 'ROLE_ADMIN';
  user_id: number | undefined;
  searchTerm: string = '';
  selectedStatus: string[] = [];
  selectedTemplate: string[] = [];
  selectedAppraisal: any; // Appraisal object for modal
  viewModalVisible: boolean = false;

  statuses: string[] = ['Pending', 'In Progress', 'Completed'];
  templates: string[] = [
    'Annual Review',
    'Quarterly Review',
    'Performance Improvement',
  ];

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.loadAppraisals();
  }

  loadAppraisals() {
    const storedAppraisals = JSON.parse(
      localStorage.getItem('appraisals') || '[]'
    );

    // Filter based on role
    if (this.userRole === 'ROLE_ADMIN') {
      this.appraisals = storedAppraisals;
    } else {
      this.appraisals = storedAppraisals.filter(
        (appraisal: any) => appraisal.assignedToUserId === this.user_id
      );
    }

    this.filteredAppraisals = [...this.appraisals];
    this.sortAppraisals();
  }

  sortAppraisals() {
    this.filteredAppraisals.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  filterAppraisals() {
    this.filteredAppraisals = this.appraisals.filter((appraisal) => {
      const matchesSearch = appraisal.employeeName
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.selectedStatus.length === 0 ||
        this.selectedStatus.includes(appraisal.progressStatus);

      const matchesTemplate =
        this.selectedTemplate.length === 0 ||
        this.selectedTemplate.includes(appraisal.template);

      return matchesSearch && matchesStatus && matchesTemplate;
    });

    this.sortAppraisals();
  }

  navigateToCreateGoal() {
    this.openAppraisalForm = !this.openAppraisalForm;
  }

  handleBack() {
    this.openAppraisalForm = false;
    this.loadAppraisals(); // Reload list after form closes
  }

  updateAppraisalStatus(appraisalId: string, newStatus: string) {
    const appraisals = JSON.parse(localStorage.getItem('appraisals') || '[]');
    const index = appraisals.findIndex((a: any) => a.user_id === appraisalId);

    if (index !== -1) {
      appraisals[index].progressStatus = newStatus;
      localStorage.setItem('appraisals', JSON.stringify(appraisals));

      this.messageService.add({
        severity: 'success',
        summary: 'Status Updated',
        detail: `Appraisal status has been updated to ${newStatus}`,
        key: 'tl',
        life: 3000,
      });

      this.loadAppraisals();
    }
  }

  navigateToCreate() {
    this.openAppraisalForm = !this.openAppraisalForm;
    this.loadAppraisals(); // Reload list after form closes
  }

  viewAppraisalDetails(appraisal: any) {
    this.selectedAppraisal = appraisal;
    this.viewModalVisible = true; // Show modal in view mode
  }

  editAppraisal(appraisal: any) {
    if (this.userRole === 'ROLE_ADMIN') {
      this.selectedAppraisal = appraisal;
      this.viewModalVisible = true;
    }
  }

  deleteAppraisal(appraisalId: any) {
    if (this.userRole === 'ROLE_ADMIN') {
      const appraisals = JSON.parse(localStorage.getItem('appraisals') || '[]');
      const updatedAppraisals = appraisals.filter(
        (a: any) => a.user_id !== appraisalId
      );

      localStorage.setItem('appraisals', JSON.stringify(updatedAppraisals));
      this.messageService.add({
        severity: 'success',
        summary: 'Deleted',
        detail: `Appraisal ID ${appraisalId} deleted successfully`,
      });

      this.loadAppraisals();
    }
  }

  closeModal() {
    this.viewModalVisible = false;
    this.viewModalVisible = false;
    this.selectedAppraisal = null;
  }
}

// import { Component, OnInit } from '@angular/core';
// import { MessageService } from 'primeng/api';
// import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
// import { FormGroup } from '@angular/forms';
// import { Route, Router } from '@angular/router';

// @Component({
//   selector: 'app-appraisallist',
//   templateUrl: './appraisallist.component.html',
//   styleUrl: './appraisallist.component.scss',
//   providers: [MessageService],
// })
// export class AppraisallistComponent implements OnInit {
//   quizStarted: boolean = false;
//   openAppraisalform = false;
//   employeeId = '';
//   department = '';
//   level = '';
//   isUserInfoSaved = false;

//   constructor(private router: Router, private messageService: MessageService) {}

//   get isFormValid() {
//     return this.employeeId && this.department && this.level;
//   }

//   ngOnInit(): void {
//     // Initialization logic here (if any)
//   }

//   saveUserInfo() {
//     const userInfo = {
//       employeeId: this.employeeId,
//       department: this.department,
//       level: this.level,
//     };
//     localStorage.setItem('currentUser', JSON.stringify(userInfo));
//     this.isUserInfoSaved = true;
//   }

//   startQuiz() {
//     // Initialize quiz data in localStorage
//     const questions = this.getQuestionsByDepartmentAndLevel();
//     localStorage.setItem(
//       'currentQuiz',
//       JSON.stringify({
//         questions,
//         currentIndex: 0,
//         startTime: new Date().getTime(),
//         answers: {},
//       })
//     );
//     this.navigateToCreate();
//   }

//   navigateToCreate() {
//     this.openAppraisalform = !this.openAppraisalform;
//   }

//   private getQuestionsByDepartmentAndLevel() {
//     // Sample questions - you would replace this with your actual questions
//     const allQuestions = [
//       {
//         id: 1,
//         text: 'Sample IT Senior Question',
//         options: ['A', 'B', 'C', 'D'],
//         correctAnswer: 'A',
//         department: 'IT',
//         level: 'Senior',
//       },
//       // Add more questions...
//     ];

//     return allQuestions
//       .filter((q) => q.department === this.department && q.level === this.level)
//       .slice(0, 30);
//   }
// }
