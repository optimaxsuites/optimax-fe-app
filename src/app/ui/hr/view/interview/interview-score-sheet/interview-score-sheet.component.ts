import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
interface Question {
  id: number;
  question: string;
  score: number | null;  // Will store the selected score
}
@Component({
  selector: 'app-interview-score-sheet',
  templateUrl: './interview-score-sheet.component.html',
  styleUrl: './interview-score-sheet.component.scss'
})
export class InterviewScoreSheetComponent {
  @Output() back = new EventEmitter<void>();
  // @Input() interview: any; // Ensure this input property is set
  @Output() submitFrom = new EventEmitter<any>();
  @Input() candidate: any;


  questions: Question[] = [];
  interviewer: any = {};
  // candidate:any = {}


  constructor() {}

  ngOnInit(): void {
    this.generateQuestions(); // Generate the list of 100 questions
  }

  goBack() {
    this.back.emit();
  }

  // Populate 100 sample questions
  generateQuestions() {
    const questionList = [
      "How well does the candidate communicate?",
      "How well does the candidate understand the job requirements?",
      "How knowledgeable is the candidate about their field?",
      "How does the candidate approach problem-solving?",
      "How does the candidate handle pressure?",
    ];

    this.questions = questionList.map((q, index) => ({
      id: index + 1,
      question: q,
      score: null
    }));
  }

  // This method will handle the form submission
  submitForm() {
    const allScores = this.questions.map(q => ({
      question: q.question,
      score: q.score
    }));

    console.log(allScores);
    this.submitFrom.emit();
  }
}
