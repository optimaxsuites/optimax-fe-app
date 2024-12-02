import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

export interface Appraisal {
  id: string;
  employeeName: string;
  appraisalCycle: string;
  template: string[];
  startDate: string;
  // endDate: string;
  dueDate: string;
  progressStatus: string;
  description: string;
  evaluator: string[];
  period: string;
  createdBy: string;
  userRole: string;
  assignedToUserId?: string;
  user_id: number;
  department: string;
  assessment: string;
}
@Component({
  selector: 'app-appraisalform',
  templateUrl: './appraisalform.component.html',
  styleUrls: ['./appraisalform.component.scss'],
})
export class AppraisalformComponent implements OnInit {
  appraisalForm!: FormGroup;
  evaluatorsList: string[] = ['Evaluator 1', 'Evaluator 2', 'Evaluator 3'];
  levelsList: string[] = ['Level 1', 'Level 2', 'Level 3'];
  @Output() back = new EventEmitter<void>();

  userRole: string = 'ROLE_ADMIN'; // Should come from auth service
  user_id?: number | undefined;

  constructor(private fb: FormBuilder, private router: Router) {
    this.initForm();
  }

  ngOnInit(): void {
    // Initialization logic can go here if needed
  }

  private initForm() {
    this.appraisalForm = this.fb.group({
      employeeName: ['', Validators.required],
      appraisalCycle: ['Individual', Validators.required],
      startDate: ['', Validators.required],
      // endDate: ['', Validators.required],
      dueDate: ['', Validators.required],
      progressStatus: ['Pending'],
      evaluator: [[]],
      level: [''],
      description: [''],
      supervisor: [''],
      period: [''],
      department: [],
      assessment: [''],
    });
  }

  onSubmit() {
    if (this.appraisalForm.valid) {
      const appraisalData: Appraisal = {
        ...this.appraisalForm.value,
        id: this.generateRandomId(),
        createdBy: this.user_id?.toString() || '', // Convert to string
        userRole: this.userRole,
        assignedToUserId: this.appraisalForm.get('employeeName')?.value, // This should be the selected employee's ID
        user_id: this.user_id || 0, // Ensure user_id is set
        createdAt: new Date().toISOString(),
      };

      // Get existing appraisals
      const existingAppraisals = JSON.parse(
        localStorage.getItem('appraisals') || '[]'
      );

      // Add new appraisal
      existingAppraisals.push(appraisalData);

      // Save back to localStorage
      localStorage.setItem('appraisals', JSON.stringify(existingAppraisals));

      // Reset form and navigate back
      this.appraisalForm.reset();
      this.goBack();
    } else {
      console.log('Form is invalid');
    }
  }

  private generateRandomId(): string {
    return Math.random().toString(36).substring(2);
  }

  goBack() {
    this.back.emit();
  }

  onCancel(): void {
    localStorage.removeItem('appraisals');
    this.appraisalForm.reset();
    this.router.navigate(['/appraisallist']);
  }
}

// import { Component, EventEmitter, OnInit, Output } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { Router } from '@angular/router';

// export interface Appraisal {
//   id: string;
//   employeeName: string;
//   appraisalCycle: string;
//   template: string[];
//   startDate: string;
//   endDate: string;
//   dueDate: string;
//   progressStatus: string;
//   description: string;
//   evaluators?: string[];
//   period: string;
//   createdBy: string;
//   userRole: string;
//   assignedToUserId?: string;
//   user_id: number;
//   department: string;
//   assessment: string;
// }
// @Component({
//   selector: 'app-appraisalform',
//   templateUrl: './appraisalform.component.html',
//   styleUrls: ['./appraisalform.component.scss'],
// })
// export class AppraisalformComponent implements OnInit {
//   questions: any[] = [];
//   currentIndex = 0;
//   selectedAnswer = '';
//   timeRemaining = 3600; // 60 minutes in seconds
//   timer: any;
//   showResults = false;
//   score = 0;

//   get currentQuestion() {
//     return this.questions[this.currentIndex];
//   }

//   get isLastQuestion() {
//     return this.currentIndex === this.questions.length - 1;
//   }

//   ngOnInit() {
//     const quizData = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
//     if (!quizData.questions) {
//       window.location.href = '/welcome';
//       return;
//     }

//     this.questions = quizData.questions;
//     this.currentIndex = quizData.currentIndex || 0;
//     this.startTimer();
//   }

//   startTimer() {
//     this.timer = setInterval(() => {
//       this.timeRemaining--;
//       if (this.timeRemaining <= 0) {
//         this.submitQuiz();
//       }
//     }, 1000);
//   }

//   formatTime(seconds: number): string {
//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = seconds % 60;
//     return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
//   }

//   previousQuestion() {
//     if (this.currentIndex > 0) {
//       this.currentIndex--;
//       this.saveProgress();
//     }
//   }

//   nextQuestion() {
//     if (this.selectedAnswer) {
//       this.saveAnswer();
//       if (this.isLastQuestion) {
//         this.submitQuiz();
//       } else {
//         this.currentIndex++;
//         this.selectedAnswer = '';
//         this.saveProgress();
//       }
//     }
//   }

//   saveAnswer() {
//     const quizData = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
//     quizData.answers = quizData.answers || {};
//     quizData.answers[this.currentQuestion.id] = this.selectedAnswer;
//     localStorage.setItem('currentQuiz', JSON.stringify(quizData));
//   }

//   saveProgress() {
//     const quizData = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
//     quizData.currentIndex = this.currentIndex;
//     localStorage.setItem('currentQuiz', JSON.stringify(quizData));
//   }

//   submitQuiz() {
//     clearInterval(this.timer);

//     const quizData = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
//     const answers = quizData.answers || {};

//     const correctAnswers = this.questions.filter(
//       (q) => answers[q.id] === q.correctAnswer
//     ).length;

//     this.score = Math.round((correctAnswers / this.questions.length) * 100);

//     // Save result
//     const userInfo = JSON.parse(localStorage.getItem('currentUser') || '{}');
//     const result = {
//       employeeId: userInfo.employeeId,
//       department: userInfo.department,
//       level: userInfo.level,
//       score: this.score,
//       completedAt: new Date().toISOString(),
//     };

//     const results = JSON.parse(localStorage.getItem('quizResults') || '[]');
//     results.push(result);
//     localStorage.setItem('quizResults', JSON.stringify(results));

//     this.showResults = true;
//   }

//   exitQuiz() {
//     localStorage.removeItem('currentQuiz');
//     window.location.href = '/welcome';
//   }

//   ngOnDestroy() {
//     if (this.timer) {
//       clearInterval(this.timer);
//     }
//   }
// }
