
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

  currentPage = 1;
  readonly pageSize = 10;

  get totalPages(): number {
    return Math.ceil(this.levelStructure.length / this.pageSize);
  }

  get pagedLevels(): LevelDTO[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.levelStructure.slice(start, start + this.pageSize);
  }

  globalIndex(localIndex: number): number {
    return (this.currentPage - 1) * this.pageSize + localIndex;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

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
      this.levelStructure = this.sortByPosition(levels);
      this.loading = false
   });

  }



  onSubmit() {
    if (this.levelForm.valid) {
      const formValue = this.levelForm.value;
      const payload: LevelDTO = {
        name: formValue.level,
        code: formValue.code,
        grade: formValue.grade || '',
        position: formValue.position || '',
        description: formValue.description || '',
      };

      if (this.isEditMode && this.editIndex !== null) {
        const id = this.levelStructure[this.editIndex].id;
        this.levelService.updateLevelById(id, payload).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Level updated successfully!', key: 'tl', life: 3000 });
            this.levelForm.reset();
            this.isEditMode = false;
            this.showAddForm = false;
            this.refreshLevels();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update level. Please try again.', key: 'tl', life: 4000 });
          }
        });
      } else {
        this.levelService.addLevel(payload).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Level added successfully!', key: 'tl', life: 3000 });
            this.levelForm.reset();
            this.showAddForm = false;
            this.refreshLevels();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add level. Please try again.', key: 'tl', life: 4000 });
          }
        });
      }
    }
  }

  private refreshLevels() {
    this.levelService.getAllLevels().subscribe(levels => {
      this.levelStructure = this.sortByPosition(levels);
    });
  }

  private sortByPosition(levels: LevelDTO[]): LevelDTO[] {
    return [...levels].sort((a, b) => {
      const pa = (a.position || '').toLowerCase();
      const pb = (b.position || '').toLowerCase();
      if (!pa && !pb) return 0;
      if (!pa) return 1;
      if (!pb) return -1;
      return pa.localeCompare(pb);
    });
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

  editSalary(level: LevelDTO, localIndex: number, event: Event) {
    event.stopPropagation();
    this.showAddForm = true
    const globalIdx = this.globalIndex(localIndex);
    this.editIndex = globalIdx;
    this.populateForm(level, globalIdx);
  }

  deleteSalary(level: LevelDTO, localIndex: number, event: Event) {
    const globalIdx = this.globalIndex(localIndex);
    this.levelService.deleteLevel(level.id).subscribe({
      next: () => {
        this.levelStructure.splice(globalIdx, 1);
        if (this.currentPage > this.totalPages && this.currentPage > 1) {
          this.currentPage--;
        }
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Level deleted successfully!', key: 'tl', life: 3000 });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete level. Please try again.', key: 'tl', life: 4000 });
      }
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
      accept: () => {
        this.deleteSalary(level, i , event);
      },
      reject: () => {

      }
    });
  }

  toogleForm() {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.isEditMode = false;
      this.editIndex = null;
      this.levelForm.reset();
    }
  }

}
