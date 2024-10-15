import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { QuestionDTO } from 'src/app/ui/hr/domain/questions.dto';
import { RandomTokenService } from 'src/app/ui/shared/service/random-token/random-token.service';

@Component({
  selector: 'app-scoresheet-config',
  templateUrl: './scoresheet-config.component.html',
  styleUrl: './scoresheet-config.component.scss',
  providers: [ConfirmationService, MessageService]
})
export class ScoresheetConfigComponent {
  showAddForm: boolean = false 
  isEditMode = false; 
  editIndex: number | null = null
  questions: QuestionDTO[] = []
  questionData: QuestionDTO = {}
  selectedQuestion: QuestionDTO ={}
  currentQuestion: string = ''; 

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private randomToken: RandomTokenService,
  ){
    this.questionData = {
      id: this.randomToken.getRandomToken(),
      title: '',
      questions: [],  // Initialize questions as an empty array
  };
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.getAllQuestions();
  }

  getAllQuestions() {
    const allQuestions = JSON.parse(localStorage.getItem('allQuestions') || '[]');
    this.questions = Object.values(allQuestions); // Convert the object to an array
    console.log('All Questions retrieved from local storage:', this.questions);
}

  addQuestion() {
    if (this.currentQuestion.trim()) {
        // Check if questionData.questions is defined and is an array
        if (Array.isArray(this.questionData.questions)) {
            this.questionData.questions.push(this.currentQuestion.trim()); // Add the current question
            this.currentQuestion = '';  // Clear the input field after adding
        } else {
            console.error('Questions array is not initialized.');
        }
    } else {
        console.log('Current question is empty.');
    }
}

  deleteQuestionArray(index: number) {
      if (index > -1 && index < this.questionData.questions!.length) {
          this.questionData.questions?.splice(index, 1);  // Remove the question at the specified index
      }
  }

  onSubmit() {
    if (this.questionData.title && this.questionData.questions?.length) {
        // Save to localStorage or wherever needed
        const allQuestions = JSON.parse(localStorage.getItem('allQuestions') || '{}');

        allQuestions[this.questionData.title] = {
            id: this.questionData.id,
            title: this.questionData.title,
            questions: [...this.questionData.questions], // Spread operator to create a copy
        };
        localStorage.setItem('allQuestions', JSON.stringify(allQuestions));

        console.log('Questions saved:', this.questionData);
        this.resetForm();
    } else {
        console.log('Title or questions are missing');
    }
}

resetForm() {
    this.questionData = {
        id: '',
        title: '',
        questions: [],  // Ensure this is initialized
    };
    this.currentQuestion = '';
}

  toogleForm() {
    this.showAddForm = !this.showAddForm
    if(this.isEditMode && this.showAddForm){
      // this.salaryForm.reset();
    }
  }

  editQuestion(questionId: QuestionDTO) {
    this.showAddForm = true;
  
    // Find the question using the question ID
    const question = this.questions.find(q => q.id === questionId);
  
    if (question) {
      this.editIndex = this.questions.indexOf(question); // Get the index of the selected question
      // this.populateForm(question, this.editIndex);
    } else {
      console.error('Question not found:', questionId);
    }
  }

  confirmQuestionDelete(question: any): void {

    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${question.title} question`,
      header: `Delete Salary Structure - ${question.id}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancle p-button-text",
      acceptIcon:"none",
      rejectIcon:"none",
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        this.deleteQuestion(question.id);
      },
      reject: () => {

      }
    });
  }
  deleteQuestion(questionId: QuestionDTO) {
    // Find the index of the job with the matching id
    const index = this.questions.findIndex(question => question.id === questionId);
    
    if (index !== -1) {
        this.questions.splice(index, 1); // Remove the job from the list
        localStorage.setItem('jobData', JSON.stringify(this.questions)); // Update localStorage
        console.log('Deleted job with id:', questionId);
        
        this.messageService.add({
            severity: 'success', 
            summary: `Delete`,
            detail: `Job posting with ${questionId} ID has been successfully deleted`
        });
    } else {
        console.log('Job not found with id:', questionId);
    }

  }

  // populateForm(question: QuestionDTO, index: number) {
  //   this.selectedQuestion = question;  // Assuming you have a property to hold the selected question
  //   this.editIndex = index;             // Store the index for later use (if needed)
    
  //   // Populate your form controls here, for example:
  //   this.questionForm.patchValue({
  //     title: question.title,
  //     question: question.question,
  //     score: question.score,
  //   });
  // }
}
