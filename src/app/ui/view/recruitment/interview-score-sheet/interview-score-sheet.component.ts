import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { QuestionDTO, QuestionItemDTO } from '../../../domain/questions.dto';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';

@Component({
  selector: 'app-interview-score-sheet',
  templateUrl: './interview-score-sheet.component.html',
  styleUrl: './interview-score-sheet.component.scss'
})
export class InterviewScoreSheetComponent implements OnInit {
  @Output() back = new EventEmitter<void>();
  // @Input() interview: any; // Ensure this input property is set
  @Output() submitFrom = new EventEmitter<any>();
  @Input() candidate: any;
  // questions: QuestionDTO[] = [];
  interviewer: any = {};
  // candidate:any = {}
  allCriteria: QuestionDTO[] = [];
  criteriaScore: QuestionDTO= {};
  selectedCriterias: QuestionItemDTO[] = [];
  userId: any;


  constructor(
    private authenticationService: AuthenticationService,
  ) {}

  ngOnInit(): void {
    this.getCriteria();
    this.getUserId(); 
  }

  getUserId(): void {
    this.userId = sessionStorage.getItem('userId'); // Retrieve userId from sessionStorage
    if (this.userId) {
      this.getUserInfo();
    } else {
      console.error('User ID not found in sessionStorage');
    }
  }

  getUserInfo(): void {
    this.authenticationService.getUserPrimaryInfoById(this.userId).subscribe({
      next: (data) => {
        this.interviewer = data;
        console.log('User Info:', this.interviewer);
      },
      error: (error) => {
        console.error('Error fetching user info:', error);
      }
    });
  }

  goBack() {
    this.back.emit();
  }

  getCriteria() {
    const criteria = localStorage.getItem('allQuestions');
    if (criteria) {
      this.allCriteria = JSON.parse(criteria);
      console.log("criteria", this.allCriteria)
    }
  }

  onCriteriaChange(selectedId: string) {
    const selectedCriteria = this.allCriteria.find(criteria => criteria.id === selectedId);
    // Assign questions or an empty array if undefined
    this.selectedCriterias = selectedCriteria ? selectedCriteria.questions || [] : [];
  }

  updateScore(question: QuestionItemDTO, score: any) {
    question.score = score; // Update the score of the question
  }

  sumOfScore: number = 0;
  totalScoreOver100: number = 0;
  maximumScore: number = 0;

  calculateTotalScore(): number {
    const sumOfScores = this.allCriteria.reduce((total, question) => {
        if (question.questions) {
          const questionScore = question.questions.reduce((subTotal, questionItem) => {
              return subTotal + (questionItem.score ? Number(questionItem.score) : 0); // Sum of individual question scores
          }, 0);

          return total + questionScore; // Add the question score to the total
        }
        return total; // If there are no questions, return the current total
    }, 0);
    this.sumOfScore = sumOfScores;
    // console.log("total score", this.sumOfScore )

    const maximumScore = this.selectedCriterias.length * 5;
    
    this.maximumScore = maximumScore;
    // console.log("maximum score", this.maximumScore )


    this.totalScoreOver100 = (sumOfScores / maximumScore) * 100; 
    console.log("totalsore------",this.criteriaScore.totalScore )

    return this.totalScoreOver100; 
}

  
  onScoreChange() {
    this.calculateTotalScore();
  }

  // Method to handle form submission or display total score
  submitForm(): void {
    const total = this.calculateTotalScore();
    console.log('Total Score:', total);
    console.log('new criterial:', this.allCriteria);
    // You can display the total score or perform other actions as needed

    // this.submitFrom.emit();
  }


}
