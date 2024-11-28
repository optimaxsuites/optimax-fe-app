import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';

interface Section {
  id: string;
  sectionTitle: string;
  instruction: string;
  questions: Question[];
  isEditing?: boolean;
}

interface Question {
  id: string;
  text: string;
  isEditing?: boolean;
}

interface AppraisalQuestionDTO {
  id?: string;
  department: string;
  level: string;
  sections: Section[];
}

@Component({
  selector: 'app-appraisalassessment',
  templateUrl: './appraisalassessment.component.html',
  providers: [MessageService, ConfirmationService],
})
export class AppraisalassessmentComponent implements OnInit {
  showAddForm = false;
  appraisalQuestionForm!: FormGroup;
  selectedDepartment: string | null = null;
  selectedLevel: string | null = null;
  isEditable = false;
  isEditing = false;
  editingSectionIndex: number | null = null;
  departments = [
    'Human Resources',
    'Finance',
    'Marketing',
    'Sales',
    'Operations',
    'Information Technology',
    'Customer Service',
    'Legal',
    'Procurement',
    'Administration',
    'Product Development',
    'Research & Development',
    'Quality Assurance',
    'Public Relations',
    'Engineering',
    'Logistics',
    'Health and Safety',
    'Security',
    'Compliance',
    'Training & Development',
  ];

  levels = [
    'Entry Level',
    'Mid Level 1',
    'Mid-Level 2',
    'Senior Level 1',
    'Senior Level 2',
    'Executive Level 1',
    'Executive Level 2',
    'C-Level',
  ];
  questionListArray: AppraisalQuestionDTO[] = [];
  appraisal: AppraisalQuestionDTO = {
    department: '',
    level: '',
    sections: [],
  };

  resetMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadQuestions();
  }

  // createSection(): FormGroup {
  //   return this.fb.group({
  //     id: [this.generateUniqueId()],
  //     sectionTitle: ['', Validators.required],
  //     instruction: ['', Validators.required],
  //     questions: this.fb.array([]),
  //   });
  // }

  getQuestionsForDepartmentAndLevel(
    department: string,
    level: string
  ): AppraisalQuestionDTO[] {
    return this.questionListArray.filter(
      (question) =>
        question.department === department && question.level === level
    );
  }

  addSection() {
    const newSection: Section = {
      id: this.generateUniqueId(),
      sectionTitle: '',
      instruction: '',
      questions: [],
      isEditing: true,
    };
    this.appraisal.sections.push(newSection);
  }

  addQuestion(sectionIndex: number) {
    const newQuestion: Question = {
      id: this.generateUniqueId(),
      text: '',
      isEditing: true,
    };
    this.appraisal.sections[sectionIndex].questions.push(newQuestion);
  }

  getSectionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  removeSection(sectionIndex: number) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete this section?`,
      accept: () => {
        this.appraisal.sections.splice(sectionIndex, 1);
        this.messageService.add({
          severity: 'success',
          summary: 'Section Deleted',
          detail: 'Section has been deleted.',
        });
      },
    });
  }

  // removeInstruction(instructionIndex: number, sectionIndex: number) {
  //   this.confirmationService.confirm({
  //     message: `Are you sure you want to delete this instruction?`,
  //     accept: () => {
  //       // Use splice to remove the instruction from the array
  //       this.appraisal.sections[sectionIndex].instruction.splice(
  //         instructionIndex,
  //         1
  //       );
  //       this.messageService.add({
  //         severity: 'success',
  //         summary: 'Instruction Deleted',
  //         detail: 'Instruction has been deleted.',
  //       });
  //     },
  //   });
  // }

  removeQuestion(sectionIndex: number, questionIndex: number) {
    this.appraisal.sections[sectionIndex].questions.splice(questionIndex, 1);
  }

  //

  selectDepartmentAndLevel(department: string, level: string) {
    this.selectedDepartment = department;
    this.selectedLevel = level;
    this.showAddForm = true;

    const existingQuestions = this.questionListArray.find(
      (q) => q.department === department && q.level === level
    );

    // If existing questions found, load them, otherwise start with a blank form
    this.appraisal = existingQuestions
      ? { ...existingQuestions }
      : {
          id: this.generateUniqueId(),
          department: department,
          level: level,
          sections: [],
        };
  }

  saveCurrentState() {
    if (!this.selectedDepartment || !this.selectedLevel) return;

    // Remove existing questions for this department and level
    const index = this.questionListArray.findIndex(
      (q) =>
        q.department === this.selectedDepartment &&
        q.level === this.selectedLevel
    );

    if (index !== -1) {
      this.questionListArray[index] = this.appraisal;
    } else {
      this.questionListArray.push(this.appraisal);
    }

    localStorage.setItem(
      'appraisalQuestions',
      JSON.stringify(this.questionListArray)
    );

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Questions saved successfully',
    });
    this.showAddForm = false;
    this.selectedDepartment = null;
    this.selectedLevel = null;
  }

  loadQuestions() {
    const savedQuestions = localStorage.getItem('appraisalQuestions');
    if (savedQuestions) {
      this.questionListArray = JSON.parse(savedQuestions);
    }
  }

  generateUniqueId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toggleForm() {
    if (this.showAddForm) {
      this.selectedDepartment = null;
      this.selectedLevel = null;
      this.appraisal = {
        id: '',
        department: '',
        level: '',
        sections: [],
      };
      this.isEditing = false;
    }
    this.showAddForm = !this.showAddForm;
  }

  isValidData(department: string, level: string): boolean {
    const existingQuestions = this.getQuestionsForDepartmentAndLevel(
      department,
      level
    );
    return existingQuestions.length > 0; // Return true if there are saved questions
  }

  view(department: string, level: string) {
    const existingQuestions = this.getQuestionsForDepartmentAndLevel(
      department,
      level
    );

    if (existingQuestions.length > 0) {
      this.appraisal = existingQuestions[0];
    } else {
      this.appraisal = {
        id: this.generateUniqueId(),
        department: department,
        level: level,
        sections: [],
      };
    }

    this.selectedDepartment = department;
    this.selectedLevel = level;
    this.isEditing = true;
    this.showAddForm = true;
  }

  hasSectionsForDepartmentAndLevel(department: string, level: string): boolean {
    const appraisal = this.questionListArray.find(
      (q) => q.department === department && q.level === level
    );
    return appraisal ? appraisal.sections.length > 0 : false;
  }

  clearSections(department: string, level: string): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to clear all sections for ${department} - ${level}?`,
      accept: () => {
        const index = this.questionListArray.findIndex(
          (q) => q.department === department && q.level === level
        );
        if (index !== -1) {
          this.questionListArray[index].sections = [];
          localStorage.setItem(
            'appraisalQuestions',
            JSON.stringify(this.questionListArray)
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Cleared',
            detail: `All sections cleared for ${department} - ${level}`,
          });
        }
      },
    });
  }

  getSteps(instructions: string): string[] {
    if (!instructions) return [];
    // Split by newline, semicolon, or comma and trim each step
    return instructions
      .split(/[\n,;]/)
      .map((step) => step.trim())
      .filter((step) => step);
  }

  toggleSectionEditing(section: Section) {
    section.isEditing = !section.isEditing;
  }

  toggleQuestionEditing(question: Question) {
    question.isEditing = !question.isEditing;
  }

  toggleInstructionEditing(instruction: Section) {
    instruction.isEditing = !instruction.isEditing;
  }
}

//
// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
// import { ConfirmationService, MessageService } from 'primeng/api';

// // interface AppraisalQuestionDTO {
// //   id?: string;
// //   department: string;
// //   level: string;
// //   sectionss: {
// //     id: string;
// //     sectionTitle: string;
// //     instruction: string;
// //     questions: {
// //       id: string;
// //       questionText: string;
// //     }[];
// //   }[];
// // }

// interface Section {
//   id: string;
//   sectionTitle: string;
//   instruction: string;
//   questions: Question[];
//   isEditing?: boolean;
// }

// interface Question {
//   id: string;
//   text: string;
//   isEditing?: boolean;
// }

// interface AppraisalQuestionDTO {
//   id?: string;
//   department: string;
//   level: string;
//   sections: Section[];
// }

// @Component({
//   selector: 'app-appraisalassessment',
//   templateUrl: './appraisalassessment.component.html',
//   providers: [MessageService, ConfirmationService],
// })
// export class AppraisalassessmentComponent implements OnInit {
//   showAddForm = false;
//   appraisalQuestionForm!: FormGroup;
//   selectedDepartment: string | null = null;
//   selectedLevel: string | null = null;
//   isEditable = false;
//   isEditing = false;
//   editingSectionIndex: number | null = null;
//   departments = [
//     'Human Resources',
//     'Finance',
//     'Marketing',
//     'Sales',
//     'Operations',
//     'Information Technology',
//     'Customer Service',
//     'Legal',
//     'Procurement',
//     'Administration',
//     'Product Development',
//     'Research & Development',
//     'Quality Assurance',
//     'Public Relations',
//     'Engineering',
//     'Logistics',
//     'Health and Safety',
//     'Security',
//     'Compliance',
//     'Training & Development',
//   ];

//   levels = [
//     'Entry Level',
//     'Mid Level 1',
//     'Mid-Level 2',
//     'Senior Level 1',
//     'Senior Level 2',
//     'Executive Level 1',
//     'Executive Level 2',
//     'C-Level',
//   ];
//   questionListArray: AppraisalQuestionDTO[] = [];
//   appraisal: AppraisalQuestionDTO = {
//     department: '',
//     level: '',
//     sections: [],
//   };
//   resetMessage: string = '';
//   app: any = {
//     sections: ([] = [this.question]),
//   };
//   question?: any[] = [];

//   constructor(
//     private fb: FormBuilder,
//     private confirmationService: ConfirmationService,
//     private messageService: MessageService
//   ) {}

//   ngOnInit() {
//     this.initForm();
//     this.loadQuestions();
//   }

//   initForm() {
//     this.appraisalQuestionForm = this.fb.group({
//       sections: this.fb.array([]),
//     });
//   }

//   createSection(): FormGroup {
//     return this.fb.group({
//       id: [this.generateUniqueId()],
//       sectionTitle: ['', Validators.required],
//       instruction: ['', Validators.required],
//       questions: this.fb.array([]),
//     });
//   }

//   getQuestionsForDepartmentAndLevel(
//     department: string,
//     level: string
//   ): AppraisalQuestionDTO[] {
//     return this.questionListArray.filter(
//       (question) =>
//         question.department === department && question.level === level
//     );
//   }

// addSection() {
//   this.app.sections.push({
//     id: this.generateUniqueId(),
//     sectionTitle: '',
//     instruction: '',
//     questions: [],
//   });
// }

// // addQuestion(sectionIndex: number) {
// //   if (this.isEditing) {
// //     const questionsArray = this.getQuestionsArray(sectionIndex);
// //     questionsArray.push(this.createQuestion());
// //   }
// // }

// addQuestion(sectionIndex: number) {
//   const section = this.app.sections[sectionIndex];
//   if (!section.questions) {
//     section.questions = [];
//   }
//   section.questions.push({ id: this.generateUniqueId(), text: '' });
// }

// createQuestion(): FormGroup {
//   return this.fb.group({
//     id: [this.generateUniqueId()],
//     questionText: ['', Validators.required],
//   });
// }

// get sectionsArray() {
//   return this.appraisalQuestionForm.get('sections') as FormArray;
// }

// getQuestionsArray(sectionIndex: number): FormArray {
//   return this.sectionsArray.at(sectionIndex).get('questions') as FormArray;
// }

// resetForm() {
//   this.appraisalQuestionForm.reset();
//   this.sectionsArray.clear();
// }

// saveCurrentState() {
//   if (!this.selectedDepartment || !this.selectedLevel) return;

//   const formValue = this.appraisalQuestionForm.value;
//   const newQuestion: AppraisalQuestionDTO = {
//     id: this.generateUniqueId(),
//     department: this.selectedDepartment,
//     level: this.selectedLevel,
//     sections: formValue.sections,
//   };

//   // Remove existing questions for this department and level
//   const index = this.questionListArray.findIndex(
//     (q) =>
//       q.department === this.selectedDepartment &&
//       q.level === this.selectedLevel
//   );

//   if (index !== -1) {
//     this.questionListArray[index] = newQuestion;
//   } else {
//     this.questionListArray.push(newQuestion);
//   }

//   localStorage.setItem(
//     'appraisalQuestions',
//     JSON.stringify(this.questionListArray)
//   );

//   this.messageService.add({
//     severity: 'success',
//     summary: 'Success',
//     detail: 'Questions saved successfully',
//   });

//   this.resetForm();
// }

// toggleEdit(sectionIndex?: number, questionIndex?: number) {
//   if (sectionIndex !== undefined && questionIndex === undefined) {
//     // Toggle edit mode for the section
//     const section = this.sectionsArray.at(sectionIndex);
//     section.get('sectionTitle')?.enable(); // Enable section title editing
//   } else if (sectionIndex !== undefined && questionIndex !== undefined) {
//     // Toggle edit mode for a specific question
//     const question = this.getQuestionsArray(sectionIndex).at(questionIndex);
//     const questionTextControl = question?.get('questionText');
//     if (questionTextControl) {
//       questionTextControl.enable(); // Enable question text editing
//     }
//   }
// }
