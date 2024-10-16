import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { QuestionDTO, QuestionItemDTO } from 'src/app/ui/hr/domain/questions.dto';
import { RandomTokenService } from 'src/app/ui/shared/service/random-token/random-token.service';

@Component({
  selector: 'app-scoresheet-config',
  templateUrl: './scoresheet-config.component.html',
  styleUrl: './scoresheet-config.component.scss',
  providers: [ConfirmationService, MessageService]
})
export class ScoresheetConfigComponent implements OnInit {
  showAddForm: boolean = false;
  editIndex: number | null = null
  questions: QuestionDTO[] = [
    // {
    //   id: "retyur8",
    //   title : "Evaluation Criteria",
    //   questions : [
    //       "Resume Review",
    //       "Relevant Experience",
    //       "Personality",
    //       "Presentation of Self",
    //       "Communication Skills",
    //       "Motivation: Enthusiasm? Commitment?",
    //       "Self Awareness: Reflective?",
    //       "Leadership",
    //       "Flexibility",
    //       "Fit with School"
    //   ]
    // }
  ]
  questionData: QuestionDTO = {}
  selectedQuestion: QuestionDTO ={}
  currentQuestion: string = ''; 
  isEdit: boolean = false;

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private randomToken: RandomTokenService,
  ){
    this.questionData = {
      id: '',
      title: '',
      questions: [],  // Initialize questions as an empty array
    };
    
  }

  ngOnInit(): void {
    this.getAllQuestions();
  }

  getAllQuestions() {
    const allQuestions = JSON.parse(localStorage.getItem('allQuestions') || '[]');
    this.questions = Object.values(allQuestions);
    console.log('All Questions retrieved from local storage:', this.questions);
}


  addQuestion() {
    if (this.currentQuestion.trim()) {
      // Ensure questions is initialized as an array
      if (!Array.isArray(this.questionData.questions)) {
        this.questionData.questions = []; // Initialize as an empty array
      }
      
      // Create a new question item
      const newQuestion: QuestionItemDTO = {
        text: this.currentQuestion.trim(),
        score: null // Initialize score as null
      };
      
      // Add the new question item to the questions array
      this.questionData.questions.push(newQuestion); 
      this.currentQuestion = ''; // Clear the input field after adding
    } else {
      console.log('Current question is empty.');
    }
  }

  deleteQuestionArray(index: number) {
    // Check if index is valid and questions array is defined
    if (this.questionData.questions && index > -1 && index < this.questionData.questions.length) {
      this.questionData.questions.splice(index, 1); // Remove the question at the specified index
    }
  }

  onSubmit() {
    if (this.questionData.title && this.questionData.questions?.length) {
      if (this.isEdit && this.editIndex !== null) {
          // Edit existing question
          this.questions[this.editIndex] = {
              ...this.questionData,
              id: this.questions[this.editIndex].id, // Preserve original ID
          };
          this.messageService.add({
            severity: 'success',
            summary: 'Update Successful',
            detail: `Question with ${this.questionData.id} ID has been updated.`
          });
          console.log('Question updated:', this.questionData);
      } else {
          // Add new question
          const newQuestion = {
              id: this.randomToken.getRandomToken(),
              title: this.questionData.title,
              questions: [...this.questionData.questions], // Make a copy
          };
          this.questions.push(newQuestion); // Add to list of questions
          console.log('New question added:', newQuestion);
          this.messageService.add({
            severity: 'success',
            summary: 'Create Successful',
            detail: `${this.questionData.title} question has been created.`
          });
      }

      // Store updated questions array in localStorage
      localStorage.setItem('allQuestions', JSON.stringify(this.questions));
      
      // Reset form and flags
      this.resetForm();
      this.showAddForm = false;
    } else {
        // console.log('Title or questions are missing');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Title and Questions field must not be empty`
        });
    }
  }


editQuestion(selectedQuestion: QuestionDTO) {
  this.showAddForm = true;
  this.isEdit = true;
  this.questionData = { ...selectedQuestion }; // Clone selected question data

  // Find the index of the question being edited
  const question = this.questions.find(q => q.id === selectedQuestion.id);
  if (question) {
      this.editIndex = this.questions.indexOf(question); // Set index for editing
  } else {
      console.error('Question not found:', selectedQuestion);
  }
}

resetForm() {
  // this.questionData = {};
  this.questionData = {
    id: '',
    title: '',
    questions: [],  // Ensure this is initialized
  };
  this.currentQuestion = '';
  this.isEdit = false;
  this.editIndex = null;
}

  toogleForm() {
    this.showAddForm = !this.showAddForm
    this.resetForm();
    this.getAllQuestions()
  }

  confirmQuestionDelete(question: QuestionDTO): void {
    this.confirmationService.confirm({
        message: `Are You sure you want to carry out this action? Clicking on DELETE, would lead to permanent removal of ${question.title} question`,
        header: `Delete Question - ${question.id}`,
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass:"p-btn-danger p-button-text",
        rejectButtonStyleClass:"p-btn-cancle p-button-text",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel: 'Delete',
        rejectLabel: 'Cancel',
        accept: () => {
            this.deleteQuestion(question);
        },
        reject: () => {
            // Optional: handle any rejection logic here
        }
    });
  }

  deleteQuestion(selectedQuestion: QuestionDTO) {
    // Find the index of the question to delete
    const index = this.questions.findIndex(q => q.id === selectedQuestion.id);
    
    if (index !== -1) {
      this.questions.splice(index, 1); // Remove the question from the list
      localStorage.setItem('allQuestions', JSON.stringify(this.questions)); // Update localStorage
      
      this.messageService.add({
          severity: 'success',
          summary: 'Delete',
          detail: `Question with ID ${selectedQuestion.id} has been successfully deleted`
      });
    } else {
        console.log('Question not found with id:', selectedQuestion.id);
    }
  }
}
