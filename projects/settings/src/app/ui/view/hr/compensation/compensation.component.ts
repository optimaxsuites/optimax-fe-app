import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TabConfig } from '../../../sharedComponents/service/interface/data';
import { SalaryService } from '../../../service/salary.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-compensation',
  templateUrl: './compensation.component.html',
  styleUrl: './compensation.component.scss',
  providers: [ConfirmationService, MessageService]
})
export class CompensationComponent {


  
compensationForm : FormGroup
  tabs: Array<'allowances' | 'bonuses' | 'deductions' | 'overtime'> = ['allowances', 'bonuses', 'deductions', 'overtime'];
  tabState: 'allowances' | 'bonuses' | 'deductions' | 'overtime' = 'allowances';
  
  dataStore = {
    allowances: [] as any[],
    bonuses: [] as any[],
    deductions: [] as any[],
    overtime: [] as any[],
  };
  
  paginatedData: any[] = [];
  loading = false;
  itemsPerPage = 10;
  currentPage = 0;
  hasMoreData = true;
  showAddForm: boolean =false;
  isEditing = false;
  editIndex: number | undefined = undefined;
 

  constructor(private fb: FormBuilder, private salaryService: SalaryService, private messageService: MessageService, private confirmationService: ConfirmationService) {
    this.loadDataBasedOnTab();
    this.compensationForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      code: [''],
      isTax: [false],
    })
  }

  loadDataBasedOnTab() {
    const activeData = this.dataStore[this.tabState];
    if (activeData.length > 0) {
      this.setupPagination();
      return;
    }

    this.loading = true;
    let fetchService;

    switch (this.tabState) {
      case 'allowances':
        fetchService = this.salaryService.getAllAllowanceTypes();
        break;
      case 'bonuses':
        fetchService = this.salaryService.getAllBonusTypes();
        break;
      case 'deductions':
        fetchService = this.salaryService.getAllDeductionsTypes();
        break;
      case 'overtime':
        fetchService = this.salaryService.getAllOverTimeTypes();
        break;
    }

    fetchService?.subscribe((data: any) => {
      this.dataStore[this.tabState] = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
      this.setupPagination();
      this.loading = false;
    });
  }

  changeTab(tab: 'allowances' | 'bonuses' | 'deductions' | 'overtime') {
    this.tabState = tab;
    this.loadDataBasedOnTab();
    this.showAddForm = false
  }

  setupPagination() {
    const activeData = this.dataStore[this.tabState];
    this.paginatedData = activeData.sort((a: any, b: any) => a.name.localeCompare(b.name)).slice(0, this.itemsPerPage);
    this.currentPage = 1;
    this.hasMoreData = this.paginatedData.length < activeData.length;
  }

  loadMore() {
    const activeData = this.dataStore[this.tabState];
    const nextPageData = activeData.slice(
      this.currentPage * this.itemsPerPage,
      (this.currentPage + 1) * this.itemsPerPage
    );
    this.paginatedData.push(...nextPageData);
    this.currentPage++;
    this.hasMoreData = this.paginatedData.length < activeData.length;
  }

  loadLess() {
    this.setupPagination();
  }

  get isPaginated(): boolean {
    return this.paginatedData.length <= this.itemsPerPage
  }

  onSubmit() {
    const formValue = this.compensationForm.value
    // this.loading = true;
    let postService;

    switch (this.tabState) {
      case 'allowances':
        const newAllownaceData = {
          name: formValue.name,
          code: formValue.code,
          description: formValue.description
        }
        postService = this.isEditing ? this.salaryService.addAllowanceType({id: this.editIndex, ...newAllownaceData}) : this.salaryService.addAllowanceType(newAllownaceData);
        break;
      case 'bonuses':
        const newBonusData = {
          name: formValue.name,
          description: formValue.description
        }
        postService = this.isEditing ? this.salaryService.addBonusType({id: this.editIndex, ...newBonusData}) : this.salaryService.addBonusType(newBonusData);
        break;
      case 'deductions':
        const newDeductionData = {
          name: formValue.name,
          description: formValue.description,
          isTax: formValue.isTax,
        }
        postService = this.isEditing ? this.salaryService.addDeductionsType({id: this.editIndex, ...newDeductionData}) : this.salaryService.addDeductionsType(newDeductionData);
        break;
      case 'overtime':
        const newOvertimeData = {
          name: formValue.name,
          description: formValue.description
        }
        postService = this.isEditing ? this.salaryService.addOverTimeType({id:this.editIndex, ...newOvertimeData}) : this.salaryService.addOverTimeType(newOvertimeData);
        break;
    }

    postService?.subscribe({
      next: (data: any) => {
        const action = this.isEditing ? 'updated' : 'added';
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `${this.tabState.slice(0, -1).toLocaleUpperCase()} ${action} successfully!`, 
          key: 'tl',
          life: 3000,
        });
  
        if (this.isEditing) {
          // Update the existing item in dataStore
          const index = this.dataStore[this.tabState].findIndex(
            (item: any) => item.id === this.editIndex
          );
          if (index !== -1) {
            this.dataStore[this.tabState][index] = data;
          }
        } else {
          // Add new item to dataStore
          this.dataStore[this.tabState].push(data);
        }
  
        this.setupPagination();
        this.compensationForm.reset();
        this.isEditing = false; // Reset editing state
        this.loading = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to ${this.isEditing ? 'update' : 'add'} ${this.tabState.slice(0, -1)}. Please try again.`,
          key: 'tl',
          life: 3000,
        });
        console.error('Error:', err);
      },
    });
  }

  toogleForm() {
    this.showAddForm =!this.showAddForm
    if(this.isEditing && this.showAddForm){
      this.compensationForm.reset();
      this.isEditing = false
      this.editIndex = undefined
    }
  }

  editCompensation(data: any, event: Event){
    event.stopPropagation();
    this.showAddForm = true
    this.isEditing = true
    this.editIndex = data.id
    this.patchForm(data)
  }

  patchForm(data: any){
    this.compensationForm.patchValue({
      name: data.name,
      description: data.description,
      code: data.code,
      isTax: data.isTax
    })
  }
  

  deleteCompensation(data: any){
    let deleteService;

    switch (this.tabState) {
      case 'allowances':
        
        deleteService =  this.salaryService.deleteAllowanceType(data.id);
        break;
      case 'bonuses':
       
        deleteService =  this.salaryService.deleteBonusType(data.id);
        break;
      case 'deductions':
    
        deleteService = this.salaryService.deleteDeductionsType(data.id);
        break;
      case 'overtime':
       
        deleteService =  this.salaryService.deleteOverTimeType(data.id);
        break;
    }

    deleteService?.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `${this.tabState.slice(0, -1)} deleted successfully!`,
          key: 'tl',
          life: 3000,
        });
  
    
        this.dataStore[this.tabState] = this.dataStore[this.tabState].filter(
          (item: any) => item.id !== data.id
        );
  
        this.setupPagination();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to delete ${this.tabState.slice(0, -1)}. Please try again.`,
          key: 'tl',
          life: 3000,
        });
        console.error('Deletion error:', err);
      },
    })

  }


  confirmCompensationDelete(data:any , event: Event): void {
    event.stopPropagation();

    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${data.name}`,
      header: `Delete Salary Structure - ${data.name}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancle p-button-text",
      acceptIcon:"none",
      rejectIcon:"none",
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        this.deleteCompensation(data);
      },
      reject: () => {

      }
    });
  }
}
