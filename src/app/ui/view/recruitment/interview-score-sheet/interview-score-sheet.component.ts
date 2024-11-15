import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { QuestionDTO, QuestionItemDTO, ScoreSheetByIdDTO, ScoreSheetDTO } from '../../../domain/questions.dto';
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
        { text: 'Assess knowledge of data structures.', score: undefined },
        { text: 'Rate understanding of object-oriented programming concepts.', score: undefined },
        { text: 'Evaluate experience with version control systems (e.g., Git).', score: undefined },
        { text: 'Rate familiarity with databases and SQL.', score: undefined },
        { text: 'Assess experience with software testing and quality assurance.', score: undefined },
        { text: 'Rate ability to work with APIs and integrations.', score: undefined },
        { text: 'Evaluate understanding of cloud technologies.', score: undefined },
        { text: 'Rate the candidate’s ability to write clean and maintainable code.', score: undefined },
        { text: 'Assess understanding of security best practices in coding.', score: undefined },
        { text: 'Rate knowledge of performance optimization techniques.', score: undefined },
        { text: 'Evaluate the ability to work with frontend technologies (HTML, CSS, JavaScript).', score: undefined },
        { text: 'Rate knowledge of backend development technologies (Node.js, Java, Python, etc.).', score: undefined },
        { text: 'Assess experience with agile methodologies and scrum.', score: undefined },
        { text: 'Evaluate the ability to collaborate in a team environment.', score: undefined },
        { text: 'Rate the candidate’s understanding of continuous integration and continuous deployment (CI/CD).', score: undefined },
        { text: 'Assess understanding of microservices architecture.', score: undefined },
        { text: 'Rate the candidate’s ability to learn new technologies quickly.', score: undefined },
        { text: 'Evaluate adaptability to new coding environments or languages.', score: undefined },
        { text: 'Rate the candidate’s attention to detail in coding.', score: undefined },
        { text: 'Assess experience with mobile app development.', score: undefined },
        { text: 'Evaluate familiarity with containerization (e.g., Docker).', score: undefined },
        { text: 'Rate understanding of software design patterns.', score: undefined },
        { text: 'Assess ability to prioritize and manage development tasks effectively.', score: undefined },
        { text: 'Evaluate experience with open-source contributions.', score: undefined },
        { text: 'Rate familiarity with front-end frameworks (e.g., Angular, React, Vue).', score: undefined },
        { text: 'Assess ability to write efficient algorithms.', score: undefined },
        { text: 'Evaluate understanding of the software development lifecycle (SDLC).', score: undefined },
      ],
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
        { text: 'Rate the ability to give constructive feedback.', score: undefined },
        { text: 'Assess ability to communicate with technical and non-technical stakeholders.', score: undefined },
        { text: 'Evaluate confidence in speaking during presentations.', score: undefined },
        { text: 'Rate ability to articulate thoughts concisely.', score: undefined },
        { text: 'Assess experience in leading meetings or discussions.', score: undefined },
        { text: 'Evaluate ability to write clear documentation and reports.', score: undefined },
        { text: 'Rate the candidate’s ability to explain technical concepts to non-technical audiences.', score: undefined },
        { text: 'Assess the ability to adapt communication style for different audiences.', score: undefined },
        { text: 'Evaluate listening skills in understanding both technical and personal concerns.', score: undefined },
        { text: 'Rate the candidate’s ability to handle difficult or contentious conversations.', score: undefined },
        { text: 'Assess overall communication with colleagues in a team environment.', score: undefined },
        { text: 'Evaluate ability to persuade and influence others through communication.', score: undefined },
        { text: 'Rate the clarity and structure of written communication (e.g., emails, reports, documentation).', score: undefined },
        { text: 'Assess ability to collaborate with a diverse group of people.', score: undefined },
        { text: 'Evaluate the use of appropriate tone and language in different scenarios.', score: undefined },
        { text: 'Rate the candidate’s ability to manage expectations through effective communication.', score: undefined },
        { text: 'Assess responsiveness and follow-through in communication.', score: undefined },
        { text: 'Evaluate ability to build relationships and rapport with others through communication.', score: undefined },
        { text: 'Rate the candidate’s ability to handle feedback professionally.', score: undefined },
        { text: 'Assess clarity and effectiveness of questions asked in discussions or meetings.', score: undefined },
        { text: 'Evaluate listening skills in terms of empathy and understanding others’ perspectives.', score: undefined },
        { text: 'Rate ability to handle misunderstandings or miscommunications effectively.', score: undefined },
        { text: 'Assess confidence in presenting and defending ideas in front of a group.', score: undefined },
        { text: 'Evaluate ability to give detailed and thoughtful answers during interviews or meetings.', score: undefined },
        { text: 'Rate the ability to summarize discussions and decisions clearly.', score: undefined },
        { text: 'Assess the ability to adapt communication style based on audience feedback.', score: undefined },
      ],
    },
    {
      id: 'n98ji',
      title: 'Technical Skills - with score',
      questions: [
        { text: 'Rate the candidate’s proficiency in coding.', score: 4 },
        { text: 'Evaluate problem-solving skills.', score: 5 },
        { text: 'Assess knowledge of system design.', score: 3 },
        { text: 'Rate familiarity with algorithms.', score: 4 },
        { text: 'Evaluate debugging capabilities.', score: 2 },
        { text: 'Assess knowledge of data structures.', score: 5 },
        { text: 'Rate understanding of object-oriented programming concepts.', score: 3 },
        { text: 'Evaluate experience with version control systems (e.g., Git).', score: 4 },
        { text: 'Rate familiarity with databases and SQL.', score: 2 },
        { text: 'Assess experience with software testing and quality assurance.', score: 3 },
        { text: 'Rate ability to work with APIs and integrations.', score: 5 },
        { text: 'Evaluate understanding of cloud technologies.', score: 4 },
        { text: 'Rate the candidate’s ability to write clean and maintainable code.', score: 3 },
        { text: 'Assess understanding of security best practices in coding.', score: 4 },
        { text: 'Rate knowledge of performance optimization techniques.', score: 2 },
        { text: 'Evaluate the ability to work with frontend technologies (HTML, CSS, JavaScript).', score: 5 },
        { text: 'Rate knowledge of backend development technologies (Node.js, Java, Python, etc.).', score: 3 },
        { text: 'Assess experience with agile methodologies and scrum.', score: 4 },
        { text: 'Evaluate the ability to collaborate in a team environment.', score: 5 },
        { text: 'Rate the candidate’s understanding of continuous integration and continuous deployment (CI/CD).', score: 3 },
        { text: 'Assess understanding of microservices architecture.', score: 4 },
        { text: 'Rate the candidate’s ability to learn new technologies quickly.', score: 5 },
        { text: 'Evaluate adaptability to new coding environments or languages.', score: 3 },
        { text: 'Rate the candidate’s attention to detail in coding.', score: 4 },
        { text: 'Assess experience with mobile app development.', score: 2 },
        { text: 'Evaluate familiarity with containerization (e.g., Docker).', score: 4 },
        { text: 'Rate understanding of software design patterns.', score: 3 },
        { text: 'Assess ability to prioritize and manage development tasks effectively.', score: 5 },
        { text: 'Evaluate experience with open-source contributions.', score: 2 },
        { text: 'Rate familiarity with front-end frameworks (e.g., Angular, React, Vue).', score: 4 },
        { text: 'Assess ability to write efficient algorithms.', score: 3 },
        { text: 'Evaluate understanding of the software development lifecycle (SDLC).', score: 5 },
      ],
    },
    {
      id: 'uuidgett5',
      title: 'Mental Skills - with score',
      questions: [
        { text: 'Evaluate verbal communication.', score: 5 },
        { text: 'Assess written communication.', score: 4 },
        { text: 'Rate clarity of expression.', score: 3 },
        { text: 'Assess active listening skills.', score: 5 },
        { text: 'Evaluate ability to explain complex ideas.', score: 4 },
        { text: 'Rate the ability to give constructive feedback.', score: 2 },
        { text: 'Assess ability to communicate with technical and non-technical stakeholders.', score: 4 },
        { text: 'Evaluate confidence in speaking during presentations.', score: 5 },
        { text: 'Rate ability to articulate thoughts concisely.', score: 3 },
        { text: 'Assess experience in leading meetings or discussions.', score: 4 },
        { text: 'Evaluate ability to write clear documentation and reports.', score: 3 },
        { text: 'Rate the candidate’s ability to explain technical concepts to non-technical audiences.', score: 5 },
        { text: 'Assess the ability to adapt communication style for different audiences.', score: 4 },
        { text: 'Evaluate listening skills in understanding both technical and personal concerns.', score: 3 },
        { text: 'Rate the candidate’s ability to handle difficult or contentious conversations.', score: 2 },
        { text: 'Assess overall communication with colleagues in a team environment.', score: 5 },
        { text: 'Evaluate ability to persuade and influence others through communication.', score: 4 },
        { text: 'Rate the clarity and structure of written communication (e.g., emails, reports, documentation).', score: 3 },
        { text: 'Assess ability to collaborate with a diverse group of people.', score: 5 },
        { text: 'Evaluate the use of appropriate tone and language in different scenarios.', score: 4 },
        { text: 'Rate the candidate’s ability to manage expectations through effective communication.', score: 5 },
        { text: 'Assess responsiveness and follow-through in communication.', score: 3 },
        { text: 'Evaluate ability to build relationships and rapport with others through communication.', score: 4 },
        { text: 'Rate the candidate’s ability to handle feedback professionally.', score: 2 },
        { text: 'Assess clarity and effectiveness of questions asked in discussions or meetings.', score: 5 },
        { text: 'Evaluate listening skills in terms of empathy and understanding others’ perspectives.', score: 4 },
        { text: 'Rate ability to handle misunderstandings or miscommunications effectively.', score: 3 },
        { text: 'Assess confidence in presenting and defending ideas in front of a group.', score: 5 },
        { text: 'Evaluate ability to give detailed and thoughtful answers during interviews or meetings.', score: 4 },
        { text: 'Rate the ability to summarize discussions and decisions clearly.', score: 3 },
        { text: 'Assess the ability to adapt communication style based on audience feedback.', score: 5 },
      ],
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

    this.sumOfScore = 0;
    this.totalScoreOver100 = 0;
    this.maximumScore = 0;
  }

  updateScore(question: QuestionItemDTO, score: any) {
    question.score = score; // Update the score of the question
  }

  sumOfScore?: number;
  totalScoreOver100?: number;
  maximumScore?: number;
  calculateTotalScore(): void {
    this.sumOfScore = this.selectedCriterias.reduce((total, question) => total + (question.score || 0), 0);
    this.maximumScore = this.selectedCriterias.length * 5; // Assuming max score for each question is 5
    this.totalScoreOver100 = this.maximumScore ? (this.sumOfScore / this.maximumScore) * 100 : 0;
  
    console.log(`Maximum Score: ${this.maximumScore}, Total Over 100: ${this.totalScoreOver100}`);
  }

  previousScore?: number;
  
  onScoreChange(changedQuestion: QuestionItemDTO): void {
    const previousScore = this.previousScore || 0;
    const currentScore = changedQuestion.score || 0;
  
    // Update sumOfScore based on the score delta
    this.sumOfScore! += currentScore - previousScore;
  
    // Update the previous score reference
    this.previousScore = currentScore;
  
    // Recalculate the scores
    this.calculateTotalScore(); // Ensure maxScore and percentage are updated here
  
    console.log(`Sum of Scores: ${this.sumOfScore}, Total Over 100: ${this.totalScoreOver100}`);
  }







// submitForm(): void {
//   // Calculate the total score before saving
//   // const total = this.calculateTotalScore();
//   console.log('Total Score:', this.totalScoreOver100);

//   // Find the selected criteria based on the selected questions
//   const selectedCriteria = this.allCriteria.find(criteria => 
//     criteria.questions === this.selectedCriterias
//   );

//   if (selectedCriteria) {
//     // Retrieve existing submitted criteria from localStorage
//     const savedData = localStorage.getItem('submittedCriteria');
//     const submittedCriteria: any = savedData ? JSON.parse(savedData) : {};

//     // Create the new criteria object to be appended
//     const newCriteriaSubmission = {
//       submittedAt: new Date().toISOString(),
//       criteria: selectedCriteria,
//       totalScore: this.totalScoreOver100
//     };

//     // Check if the candidate ID already exists in the submittedCriteria object
//     if (!submittedCriteria[this.candidate.id]) {
//       // If the candidate does not have any submitted criteria, initialize an empty array for them
//       submittedCriteria[this.candidate.id] = [];
//     }

//     // Check if this specific criteria has already been submitted by this candidate
//     const isAlreadySubmitted = submittedCriteria[this.candidate.id].some(
//       (submission: any) => submission.criteria.id === selectedCriteria.id
//     );

//     if (isAlreadySubmitted) {
//       // Show a message if the criteria has been submitted before
//       this.messageService.add({
//         severity: 'warn',
//         summary: 'Duplicate Submission',
//         detail: 'This scoresheet has already been submitted.'
//       });
//     } else {
//       // Append the new criteria submission for the candidate
//       submittedCriteria[this.candidate.id].push(newCriteriaSubmission);

//       // Save the updated list to localStorage
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

//   // Reset scores for all questions in all criteria
//   this.allCriteria.forEach(criteria => {
//     if (criteria.questions) { // Ensure questions is defined
//       criteria.questions.forEach(question => {
//         question.score = undefined;
//       });
//     }
//   });
  

//   this.sumOfScore = 0;
//   this.totalScoreOver100 = 0;
//   this.maximumScore = 0;
// }

submitForm(): void {
  console.log('Total Score:', this.totalScoreOver100);

  // Find the selected criteria based on the selected questions
  const selectedCriteria = this.allCriteria.find(criteria => 
    criteria.questions === this.selectedCriterias
  );

  if (selectedCriteria) {
    // Retrieve existing submitted criteria from localStorage
    const savedData = localStorage.getItem('submittedCriteria');
    const submittedCriteria: ScoreSheetByIdDTO = savedData 
      ? JSON.parse(savedData) 
      : {};

    // Create the new criteria object to be appended
    const newCriteriaSubmission: ScoreSheetDTO = {
      submittedAt: new Date().toISOString(),
      criteria: {
        id: selectedCriteria.id!,
        title: selectedCriteria.title!,
        questions: selectedCriteria.questions!
      },
      totalScore: this.totalScoreOver100
    };

    // Initialize an array for this candidate if not present
    if (!submittedCriteria[this.candidate.id]) {
      submittedCriteria[this.candidate.id] = [];
    }

    // Check if this specific criteria has already been submitted by this candidate
    const isAlreadySubmitted = submittedCriteria[this.candidate.id].some(
      submission => submission.criteria?.id === selectedCriteria.id
    );

    if (isAlreadySubmitted) {
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

  // Reset scores for all questions in all criteria
  this.allCriteria.forEach(criteria => {
    criteria.questions?.forEach(question => {
      question.score = undefined; // Reset each question's score
    });
  });

  this.sumOfScore = 0;
  this.totalScoreOver100 = 0;
  this.maximumScore = 0;
}


}
