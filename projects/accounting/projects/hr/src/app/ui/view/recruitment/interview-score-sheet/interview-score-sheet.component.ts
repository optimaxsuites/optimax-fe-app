import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { QuestionDTO, QuestionItemDTO } from '../../../domain/questions.dto';

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




  constructor() {}

  ngOnInit(): void {
    
    this.getCriteria(); 
    // const criteria = localStorage.getItem('allQuestions');
    // if (criteria) {
    //   this.allCriteria = JSON.parse(criteria);
    //   console.log("criteria", this.allCriteria)
    // }
    // console.log('----', criteria)
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


  // Call this method whenever a score is changed
  
//   calculateTotalScore(): number {
//     // Array to hold each individual question score
//     let individualScores: number[] = [];

//     // Calculate the sum of scores from all criteria
//     const sumOfScores = this.allCriteria.reduce((total, question) => {
//         if (question.questions) {
//             const questionScore = question.questions.reduce((subTotal, questionItem) => {
//                 const score = questionItem.score ? Number(questionItem.score) : 0;
//                 individualScores.push(score); // Store each question's score in the array
//                 return subTotal + score; 
//             }, 0);
//             return total + questionScore; 
//         }
//         return total; 
//     }, 0);

//     this.sumOfScore = sumOfScores;

//     // Calculate the maximum score based on allCriteria
//     const maximumScore = this.allCriteria.reduce((count, question) => {
//         return count + (question.questions ? question.questions.length : 0);
//     }, 0) * 5; // Assuming each question can score a maximum of 5 points

//     this.maximumScore = maximumScore;

//     // Calculate the score as a percentage
//     this.totalScoreOver100 = (sumOfScores / maximumScore) * 100;

//     // Assign individual question scores to criteriaScore
//     this.criteriaScore.questions.score = individualScores;

//     // Save criteriaScore to local storage
//     localStorage.setItem('criteriaScore', JSON.stringify(this.criteriaScore));

//     console.log("Individual Scores:", this.criteriaScore.questions.score);
//     console.log("Criteria Score saved to local storage:", this.criteriaScore);

//     return this.totalScoreOver100; 
// }
  
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
