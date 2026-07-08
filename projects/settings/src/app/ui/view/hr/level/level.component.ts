
interface LevelStructure {
  level: string;
  description: string;

}

import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LevelService } from '../../../service/level.service';
import { LevelDTO } from '../../../domain/level.dto';

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
  levelStructure: LevelDTO[] = []
  loading: boolean = false

  constructor(private fb: FormBuilder, private confirmationService: ConfirmationService, private levelService: LevelService,
    private messageService: MessageService  ) {
    this.levelForm = this.fb.group({
      level: ['', Validators.required],
      code: ['', Validators.required],
      grade: [''],
      position: [''],
      description: [''],
    });
  }
  ngOnInit() {
    this.loading = true
    this.levelService.getAllLevels().subscribe(levels => {
      this.levelStructure = levels
    this.loading = false

   });
  
  }
  
 

  onSubmit() {
    console.log('New Salary Structure:', this.levelForm.value);

    if (this.levelForm.valid) {
      const formValue = this.levelForm.value;
  
      
      const newlevelStructure = {
        name: formValue.level,
        code: formValue.code,
        grade: formValue.grade || '',
        position: formValue.position || '',
        description: formValue.description || '',
      };
  
      if (this.isEditMode && this.editIndex !== null) {
        this.levelStructure[this.editIndex] = {
          id: this.levelStructure[this.editIndex].id,
          ...newlevelStructure
        };
       const id = this.levelStructure[this.editIndex].id
        
      this.levelService.updateLevelById(id, newlevelStructure).subscribe(() => {
       this.messageService.add({ severity: 'success', summary: 'Success', detail: "Level updated successfully!", key: 'tl', life: 3000  }); 
       this.levelForm.reset();
       this.isEditMode = false;
      });

      } else {
        this.levelStructure.push(newlevelStructure);
      this.levelService.addLevel(newlevelStructure).subscribe(() => {
       this.messageService.add({ severity: 'success', summary: 'Success', detail: "Leave added successfully!", key: 'tl', life: 3000  }); 
       this.levelForm.reset();

      });
      }



     
  
      console.log('New Salary Structure:', newlevelStructure);
    } else {
      console.error('Form is invalid');
    }
  }

  populateForm(levelStructure: any, index: number) {
    this.isEditMode = true;
    this.editIndex = index;
    this.levelForm.patchValue({
      level: levelStructure.name,
      code: levelStructure.code,
      grade: levelStructure.grade || '',
      position: levelStructure.position || '',
      description: levelStructure.description || '',
    });

 

  }

    toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  editSalary(level: LevelDTO, index:number, event: Event) {
   
    event.stopPropagation();
    this.showAddForm = true
    this.editIndex = index
    this.populateForm(level, index)
  }

  deleteSalary(level: LevelDTO, index:number, event: Event) {
    this.levelStructure.splice(index, 1);
    
    this.levelService.deleteLevel(level.id).subscribe(() => {
      this.messageService.add({ severity: 'success', summary: 'Success', detail: "Leave deleted successfully!", key: 'tl', life: 3000  }); 
    });
  }


  confirmSalaryDelete(level: LevelDTO, i: number , event: Event): void {
    event.stopPropagation();

    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${level.name}'s salary structure`,
      header: `Delete Salary Structure - ${level.name}`,
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
