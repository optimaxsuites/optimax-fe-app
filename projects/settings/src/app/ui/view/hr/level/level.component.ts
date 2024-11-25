
interface LevelStructure {
  level: string;
  description: string;

}

import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-level',
  templateUrl: './level.component.html',
  styleUrl: './level.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class LevelComponent {
  showAddForm: boolean = false 
  isEditMode = false; 
  editIndex: number | null = null
  
  levelForm: FormGroup;
  levelStructure: LevelStructure[] = []
   levels = [
    {
      level: 'Intern',
      description: 'Entry-level position for gaining industry experience. Often involves learning and assisting with tasks under supervision.',
    },
    {
      level: 'Junior Staff',
      description: 'Performs basic tasks and supports team operations. Requires some supervision and basic skill levels.',
    },
    {
      level: 'Entry Level',
      description: 'The starting position for professionals in a specific field. Responsible for individual tasks and deliverables.',
    },
    {
      level: 'Mid Level 1',
      description: 'Handles more complex responsibilities, often requiring some decision-making and independent work.',
    },
    {
      level: 'Mid Level 2',
      description: 'Experienced professional with advanced responsibilities, including mentoring junior staff.',
    },
    {
      level: 'Senior Level 1',
      description: 'High-level professional who oversees key tasks and projects. Often involved in strategic decision-making.',
    },
    {
      level: 'Senior Level 2',
      description: 'Seasoned expert managing teams, projects, and contributing to organizational strategy and growth.',
    },
    {
      level: 'Executive Level 1',
      description: 'Leadership position with responsibilities for managing departments and driving organizational goals.',
    },
    {
      level: 'Executive Level 2',
      description: 'Senior leadership role overseeing critical areas of the business with significant decision-making authority.',
    },
    {
      level: 'C-Level',
      description: 'Top executive role responsible for the overall strategy, vision, and direction of the organization.',
    },
  ];
  

  constructor(private fb: FormBuilder, private confirmationService: ConfirmationService,
    private messageService: MessageService  ) {
    this.levelForm = this.fb.group({
      level: ['', Validators.required],
      description: ['', [Validators.required, Validators.min(0)]],
     
    });
  }
  ngOnInit() {
    const levelsFromStorage = localStorage.getItem("levelStructure");
    
    if (levelsFromStorage) {

      const storedSalaries = JSON.parse(levelsFromStorage);
  

      this.levelStructure = storedSalaries.map((salary: any) => ({
        ...salary,
        netSalary: function () {
          const grossSalary = this.baseSalary + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.internshipCompletionBonus || 0);
          return grossSalary - (this.deductions.tax + (this.deductions.pension || 0));
        }
      }));
  
    }
  
  else {
    localStorage.setItem("levelStructure", JSON.stringify(this.levels))
    const salariesFromStorage = localStorage.getItem("levelStructure");
    
    if (salariesFromStorage) {

      const storedSalaries = JSON.parse(salariesFromStorage);
  

      this.levelStructure = storedSalaries.map((salary: any) => ({
        ...salary,
        netSalary: function () {
          const grossSalary = this.baseSalary + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.internshipCompletionBonus || 0);
          return grossSalary - (this.deductions.tax + (this.deductions.pension || 0));
        }
      }));
  
    }
  }
  }
  
 

  onSubmit() {
    console.log('New Salary Structure:', this.levelForm.value);

    if (this.levelForm.valid) {
      const formValue = this.levelForm.value;
  
      
      const newlevelStructure = {
        level: formValue.level,
        description: formValue.description,
   
      };
  
      if (this.isEditMode && this.editIndex !== null) {
        this.levelStructure[this.editIndex] = newlevelStructure;
      } else {
        this.levelStructure.push(newlevelStructure);
      }

      localStorage.setItem('levelStructure', JSON.stringify(this.levelStructure));
      this.levelForm.reset();
      this.showAddForm = false;
      this.isEditMode = false;
      this.editIndex = null;
  
      console.log('New Salary Structure:', newlevelStructure);
    } else {
      console.error('Form is invalid');
    }
  }

  populateForm(levelStructure: any, index: number) {
    this.isEditMode = true;
    this.editIndex = index;
    this.levelForm.patchValue({
      level: levelStructure.level,
      description: levelStructure.baseSalary,
    });

 

  }

    toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  editSalary(level: LevelStructure, index:number, event: Event) {
   
    event.stopPropagation();
    this.showAddForm = true
    this.editIndex = index
    this.populateForm(level, index)
  }

  deleteSalary(salary: LevelStructure, index:number, event: Event) {

    this.levelStructure.splice(index, 1);
    localStorage.setItem('levelStructure', JSON.stringify(this.levelStructure));

  }


  confirmSalaryDelete(level: LevelStructure, i: number , event: Event): void {
    event.stopPropagation();

    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${level.level}'s salary structure`,
      header: `Delete Salary Structure - ${level.level}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancle p-button-text",
      acceptIcon:"none",
      rejectIcon:"none",
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        this.deleteSalary(level, i , event);
      },
      reject: () => {

      }
    });
  }

  toogleForm() {
    
    this.showAddForm = !this.showAddForm
    if(this.isEditMode && this.showAddForm){
      this.levelForm.reset();
    }
  }

}
