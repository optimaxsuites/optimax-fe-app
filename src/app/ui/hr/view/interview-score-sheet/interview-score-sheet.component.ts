import { Component } from '@angular/core';
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
  // interviewForm!: FormGroup;
  // questions: any[] = [];

  // constructor(private fb: FormBuilder) {}

  // ngOnInit(): void {
  //   this.generateQuestions(); // Generate the list of 100 questions
  //   this.createForm();
  // }

  // // Populate 100 sample questions
  // generateQuestions() {
  //   const questionList = [
  //     "How well does the candidate communicate?",
  //     "How well does the candidate understand the job requirements?",
  //     "How knowledgeable is the candidate about their field?",
  //     "How does the candidate approach problem-solving?",
  //     "How does the candidate handle pressure?",
  //     "Is the candidate a good team player?",
  //     "Does the candidate have leadership potential?",
  //     "How innovative is the candidate in their thinking?",
  //     "How does the candidate handle feedback?",
  //     "How flexible is the candidate with new ideas?",
  //     "How well does the candidate manage time?",
  //     "Does the candidate exhibit strong technical skills?",
  //     "Is the candidate able to adapt to changing environments?",
  //     "Does the candidate demonstrate critical thinking?",
  //     "How well does the candidate collaborate with others?",
  //     "Is the candidate a self-starter?",
  //     "How does the candidate handle conflict in a team setting?",
  //     "How well does the candidate set and achieve goals?",
  //     "Does the candidate show enthusiasm for the position?",
  //     "How well does the candidate understand the company's values?",
  //     "Does the candidate exhibit ethical behavior?",
  //     "How is the candidate's attention to detail?",
  //     "How is the candidate's decision-making ability?",
  //     "Does the candidate have a positive attitude?",
  //     "How does the candidate demonstrate integrity?",
  //     "Does the candidate have experience relevant to this role?",
  //     "How well does the candidate handle constructive criticism?",
  //     "Does the candidate have a strong work ethic?",
  //     "How creative is the candidate in their approach to challenges?",
  //     "How well does the candidate work independently?",
  //     "Is the candidate motivated to learn and grow?",
  //     "Does the candidate show strong analytical skills?",
  //     "How does the candidate handle multitasking?",
  //     "Is the candidate able to prioritize tasks effectively?",
  //     "How well does the candidate present their ideas?",
  //     "How would you rate the candidate's interpersonal skills?",
  //     "How does the candidate handle ambiguity?",
  //     "Is the candidate comfortable working in cross-functional teams?",
  //     "How does the candidate respond to failure?",
  //     "Is the candidate driven by results?",
  //     "How well does the candidate align with the company's goals?",
  //     "Does the candidate take ownership of their work?",
  //     "Is the candidate accountable for their actions?",
  //     "How well does the candidate handle responsibility?",
  //     "Does the candidate exhibit confidence without arrogance?",
  //     "How would you rate the candidate's adaptability to technology?",
  //     "Does the candidate exhibit curiosity about new developments in the field?",
  //     "How well does the candidate manage their workload?",
  //     "Does the candidate exhibit professionalism in their demeanor?",
  //     "Is the candidate detail-oriented?",
  //     "Does the candidate have strong negotiation skills?",
  //     "How well does the candidate fit into the team culture?",
  //     "Is the candidate capable of leading a project?",
  //     "How well does the candidate manage conflict with clients or stakeholders?",
  //     "Does the candidate demonstrate empathy?",
  //     "Is the candidate goal-oriented?",
  //     "How well does the candidate collaborate with diverse teams?",
  //     "Does the candidate have a clear vision for their role?",
  //     "How effective is the candidate in managing their resources?",
  //     "Does the candidate show a passion for the industry?",
  //     "How effective is the candidate's written communication?",
  //     "Is the candidate open to continuous learning?",
  //     "Does the candidate demonstrate accountability?",
  //     "How effective is the candidate in mentoring others?",
  //     "Is the candidate able to meet deadlines consistently?",
  //     "Does the candidate demonstrate reliability?",
  //     "How would you rate the candidate's strategic thinking?",
  //     "How does the candidate manage risks in their work?",
  //     "Is the candidate able to learn from mistakes?",
  //     "How would you rate the candidate's decision-making in complex situations?",
  //     "Does the candidate demonstrate initiative in their work?",
  //     "Is the candidate's work output consistently high-quality?",
  //     "How does the candidate handle challenging tasks?",
  //     "Does the candidate show a growth mindset?",
  //     "How does the candidate approach solving complex problems?",
  //     "Is the candidate customer-focused?",
  //     "Does the candidate manage resources efficiently?",
  //     "How effective is the candidate in managing relationships?",
  //     "Does the candidate show initiative in improving processes?",
  //     "How would you rate the candidate's leadership in a team setting?",
  //     "How well does the candidate manage stress?",
  //     "Does the candidate display enthusiasm for learning new skills?",
  //     "Is the candidate capable of making data-driven decisions?",
  //     "How well does the candidate articulate their ideas in writing?",
  //     "Does the candidate demonstrate flexibility in managing tasks?",
  //     "How well does the candidate handle constructive feedback?",
  //     "Does the candidate exhibit sound judgment?",
  //     "How well does the candidate fit within the organizational culture?",
  //     "Is the candidate focused on delivering results?",
  //     "How would you rate the candidate's creativity in problem-solving?",
  //     "Is the candidate capable of effectively managing change?",
  //     "Does the candidate show empathy towards colleagues?",
  //     "How well does the candidate identify and solve problems?",
  //     "How well does the candidate manage deadlines under pressure?",
  //     "Does the candidate demonstrate an understanding of project goals?",
  //     "How would you rate the candidate's negotiation skills?",
  //     "Does the candidate contribute to team success?",
  //     "Is the candidate able to align their work with organizational goals?",
  //     "Does the candidate have strong verbal communication skills?",
  //   ];

  //   for (let i = 0; i < 100; i++) {
  //     this.questions.push({
  //       id: i + 1,
  //       question: questionList[i % questionList.length], // Loop through the question list
  //       score: null
  //     });
  //   }
  // }

  // createForm() {
  //   this.interviewForm = this.fb.group({
  //     scores: this.fb.array(this.questions.map(() => this.fb.control(null, Validators.required)))
  //   });
  // }

  // get scores() {
  //   return this.interviewForm.get('scores') as FormArray;
  // }

  // submitForm() {
  //   const allScores = this.questions.map(q => ({
  //     question: q.question,
  //     score: q.score
  //   }));

  //   console.log(allScores);
  // }


  questions: Question[] = [];
  interviewer: any = {};

  constructor() {}

  ngOnInit(): void {
    this.generateQuestions(); // Generate the list of 100 questions
  }

  // Populate 100 sample questions
  generateQuestions() {
    const questionList = [
      "How well does the candidate communicate?",
      "How well does the candidate understand the job requirements?",
      "How knowledgeable is the candidate about their field?",
      "How does the candidate approach problem-solving?",
      "How does the candidate handle pressure?",
      // ... Add more questions as needed, until you reach 100
    ];

    for (let i = 0; i < 100; i++) {
      this.questions.push({
        id: i + 1,
        question: questionList[i % questionList.length], // Loop through the question list
        score: null
      });
    }
  }

  // This method will handle the form submission
  submitForm() {
    const allScores = this.questions.map(q => ({
      question: q.question,
      score: q.score
    }));

    console.log(allScores);
  }
}
