import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { QuestionDTO, QuestionItemDTO } from '../../../domain/questions.dto';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-interview-score-sheet',
  templateUrl: './interview-score-sheet.component.html',
  styleUrl: './interview-score-sheet.component.scss',
  providers: [MessageService]
})
export class InterviewScoreSheetComponent implements OnInit {
  @Output() back = new EventEmitter<void>();
  @Output() submitFrom = new EventEmitter<any>();
  @Input() candidate: any;
  interviewer: any = {};
  criteriaScore: QuestionDTO= {};
  selectedCriterias: QuestionItemDTO[] = [];
  userId: any;
  allCriteria: QuestionDTO[] = [
    {
      id: 'ertyu',
      title: 'Technical Skills',
      questions: [
        { text: 'Rate the candidate’s proficiency in coding.', score: undefined },
        { text: 'Evaluate problem-solving skills.', score: undefined },
        { text: 'Assess knowledge of system design.', score: undefined },
        { text: 'Rate familiarity with algorithms.', score: undefined },
        { text: 'Evaluate debugging capabilities.', score: undefined },
      ],
      totalScore: undefined
    },
    {
      id: '8908',
      title: 'Mental Skills',
      questions: [
        { text: 'Evaluate verbal communication.', score: undefined },
        { text: 'Assess written communication.', score: undefined },
        { text: 'Rate clarity of expression.', score: undefined },
        { text: 'Assess active listening skills.', score: undefined },
        { text: 'Evaluate ability to explain complex ideas.', score: undefined },
      ],
      totalScore: undefined
    }
  ];


  constructor(
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.getCriteria();
    this.getUserId(); 
  }

  getUserId(): void {
    this.userId = sessionStorage.getItem('userid'); // Retrieve userId from sessionStorage
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
    console.log("totalsore------",this.totalScoreOver100)

    return this.totalScoreOver100; 
}

  
  onScoreChange() {
    this.calculateTotalScore();
  }
  
  // submitForm(): void {
  //   // Calculate the total score before saving
  //   const total = this.calculateTotalScore();
  //   console.log('Total Score:', total);
  
  //   // Save allCriteria as an array in localStorage under the key 'allQuestions'
  //   const allQuestions = [...this.allCriteria]; // Ensure it's an array
  //   localStorage.setItem('interviewScoreSheet', JSON.stringify(allQuestions));
  
  //   console.log('New criteria saved to localStorage:', allQuestions);
  
  //   this.messageService.add({
  //     severity: 'success', 
  //     summary: 'Success',
  //     detail: 'Scoresheet submitted successfully.' 
  //   }); 
  // }

  // submitForm(): void {
  //   // Calculate the total score before saving
  //   const total = this.calculateTotalScore();
  //   console.log('Total Score:', total);
  
  //   // Find the selected criteria based on the selected questions
  //   const selectedCriteria = this.allCriteria.find(criteria => 
  //     criteria.questions === this.selectedCriterias
  //   );
  
  //   if (selectedCriteria) {
  //     // Save only the selected criteria to localStorage
  //     localStorage.setItem('interviewScoreSheet', JSON.stringify(selectedCriteria));
  //     console.log('Selected criteria saved to localStorage:', selectedCriteria);
    
  //     // Success message
  //     this.messageService.add({
  //       severity: 'success',
  //       summary: 'Submission Successful',
  //       detail: 'Selected scoresheet submitted and saved successfully.'
  //     });
  //   } else {
  //     // Error handling if no criteria is selected
  //     this.messageService.add({
  //       severity: 'error',
  //       summary: 'Submission Failed',
  //       detail: 'No criteria selected. Please select and try again.'
  //     });
  //   }
  // }
  
//   submitForm(): void {
//   // Calculate the total score before saving
//   const total = this.calculateTotalScore();
//   console.log('Total Score:', total);

//   // Find the selected criteria based on the selected questions
//   const selectedCriteria = this.allCriteria.find(criteria => 
//     criteria.questions === this.selectedCriterias
//   );

//   if (selectedCriteria) {
//     const savedData = localStorage.getItem('submittedCriteria');
//     const submittedCriteria = savedData ? JSON.parse(savedData) : [];

//     // Check if the selected criteria has already been submitted
//     const isAlreadySubmitted = submittedCriteria.some(
//       (criteria: QuestionDTO) => criteria.id === selectedCriteria.id
//     );

//     if (isAlreadySubmitted) {
//       // Show a message if the criteria has been submitted before
//       this.messageService.add({
//         severity: 'warn',
//         summary: 'Duplicate Submission',
//         detail: 'This scoresheet has already been submitted.'
//       });
//     } else {
//       // Save the new selected criteria to localStorage
//       submittedCriteria.push(selectedCriteria);
//       localStorage.setItem('submittedCriteria', JSON.stringify(submittedCriteria));

//       console.log('Selected criteria saved to localStorage:', selectedCriteria);

//       this.messageService.add({
//         severity: 'success',
//         summary: 'Submission Successful',
//         detail: 'Selected scoresheet submitted and saved successfully.'
//       });
//     }
//   } else {
//     // Error handling if no criteria is selected
//     this.messageService.add({
//       severity: 'error',
//       summary: 'Submission Failed',
//       detail: 'No criteria selected. Please select and try again.'
//     });
//   }
// }


// submitForm(): void {
//   // Calculate the total score before saving
//   const total = this.calculateTotalScore();
//   console.log('Total Score:', total);

//   // Find the selected criteria based on the selected questions
//   const selectedCriteria = this.allCriteria.find(criteria => 
//     criteria.questions === this.selectedCriterias
//   );

//   if (selectedCriteria) {
//     // Get the saved submissions from localStorage, or initialize an empty array if none exist
//     const savedData = localStorage.getItem('submittedCriteria');
//     const submittedCriteria = savedData ? JSON.parse(savedData) : [];

//     // Check if the selected criteria has already been submitted for the candidate
//     const isAlreadySubmitted = submittedCriteria[this.candidate.id]?.some(
//       (criteria: any) => criteria.id === selectedCriteria.id
//     );

//     if (isAlreadySubmitted) {
//       // Show a message if the criteria has already been submitted for this candidate
//       this.messageService.add({
//         severity: 'warn',
//         summary: 'Duplicate Submission',
//         detail: 'This scoresheet has already been submitted for this candidate.'
//       });
//     } else {

//       // Add the new selected criteria to the candidate's submission
//       if (!submittedCriteria[this.candidate.id]) {
//         submittedCriteria[this.candidate.id] = []; // Initialize the array if it doesn't exist
//       }

//       // Save the new selected criteria to localStorage along with the candidate info
//       submittedCriteria[this.candidate.id].push({
//         submittedAt: new Date().toISOString(),
//         criteria: selectedCriteria
//       });
      
//       // Save the updated list to localStorage
//       localStorage.setItem('submittedCriteria', JSON.stringify(submittedCriteria));

//       console.log('Selected criteria saved to localStorage:', selectedCriteria);
//       console.log('-------------------')
//       console.log('submitted criteria saved to localStorage:', submittedCriteria);


//       this.messageService.add({
//         severity: 'success',
//         summary: 'Submission Successful',
//         detail: 'Selected scoresheet submitted and saved successfully.'
//       });
//     }
//   } else {
//     // Error handling if no criteria is selected
//     this.messageService.add({
//       severity: 'error',
//       summary: 'Submission Failed',
//       detail: 'No criteria selected. Please select and try again.'
//     });
//   }
// }







submitForm(): void {
  // Calculate the total score before saving
  const total = this.calculateTotalScore();
  console.log('Total Score:', total);

  // Find the selected criteria based on the selected questions
  const selectedCriteria = this.allCriteria.find(criteria => 
    criteria.questions === this.selectedCriterias
  );

  if (selectedCriteria) {
    // Retrieve existing submitted criteria from localStorage
    const savedData = localStorage.getItem('submittedCriteria');
    const submittedCriteria: any = savedData ? JSON.parse(savedData) : {};

    // Create the new criteria object to be appended
    const newCriteriaSubmission = {
      submittedAt: new Date().toISOString(),
      criteria: selectedCriteria
    };

    // Check if the candidate ID already exists in the submittedCriteria object
    if (!submittedCriteria[this.candidate.id]) {
      // If the candidate does not have any submitted criteria, initialize an empty array for them
      submittedCriteria[this.candidate.id] = [];
    }

    // Check if this specific criteria has already been submitted by this candidate
    const isAlreadySubmitted = submittedCriteria[this.candidate.id].some(
      (submission: any) => submission.criteria.id === selectedCriteria.id
    );

    if (isAlreadySubmitted) {
      // Show a message if the criteria has been submitted before
      this.messageService.add({
        severity: 'warn',
        summary: 'Duplicate Submission',
        detail: 'This scoresheet has already been submitted.'
      });
    } else {
      // Append the new criteria submission for the candidate
      submittedCriteria[this.candidate.id].push(newCriteriaSubmission);

      // Save the updated list to localStorage
      localStorage.setItem('submittedCriteria', JSON.stringify(submittedCriteria));

      console.log('Selected criteria saved to localStorage:', selectedCriteria);

      this.messageService.add({
        severity: 'success',
        summary: 'Submission Successful',
        detail: 'Selected scoresheet submitted and saved successfully.'
      });
    }
  } else {
    // Error handling if no criteria is selected
    this.messageService.add({
      severity: 'error',
      summary: 'Submission Failed',
      detail: 'No criteria selected. Please select and try again.'
    });
  }
}


}
