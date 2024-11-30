


import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LeaveService } from '../../../service/leave.service';
import { LeaveDTO, LeaveTypeDTO } from '../../../domain/leave.dto';

@Component({
  selector: 'app-leave',
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class LeaveComponent {
  showAddForm: boolean = false 
  isEditMode = false; 
  editIndex: number | null = null
  
  leaveForm: FormGroup;
  leaveStructure: LeaveTypeDTO[] = []
   

  loading: boolean = false
  paginatedLeaves: LeaveTypeDTO[] = []; 
  itemsPerPage: number = 10; 
  currentPage: number = 0;
  hasMoreData: boolean = true;
  

  constructor(private fb: FormBuilder, private confirmationService: ConfirmationService, private leaveService: LeaveService,
    private messageService: MessageService  ) {
    this.leaveForm = this.fb.group({
      leave: ['', Validators.required],
      leavePaidStatus: ['', [Validators.required]],
      effectiveAfter: [0, [Validators.required, Validators.min(0)]],
      allowedInProbation: [false, []],
      allowedInNoticePeriod: [false, []],
      description: ['', [Validators.required]],
      code: ['', [Validators.required]],
      defaultDays: [0, [Validators.min(0), Validators.required]]
    });
  }
  ngOnInit() {
    this.loading = true
    this.leaveService.getAllLeaveType().subscribe(leaves => {
      this.leaveStructure = leaves
      this.loadMore()

      this.loading = false

   });


  }
  
  loadMore() {
    const nextPageData = this.leaveStructure.slice(
      this.currentPage * this.itemsPerPage,
      (this.currentPage + 1) * this.itemsPerPage
    );

    this.paginatedLeaves.push(...nextPageData);
    this.currentPage++;

    this.hasMoreData = this.paginatedLeaves.length < this.leaveStructure.length;
  }

  loadLess() {
    this.currentPage = 0
   this.paginatedLeaves = []
   this.loadMore()
  }

  onSubmit() {
    console.log('New Salary Structure:', this.leaveForm.value);

    if (this.leaveForm.valid) {
      const formValue = this.leaveForm.value;
  
      
      const newleaveStructure = {
        name: formValue.leave,
        payStatus: formValue.leavePaidStatus,
        effectiveAfter: formValue.effectiveAfter,
        allowedInProbation: formValue.allowedInProbation,
        allowedInNoticePeriod: formValue.allowedInNoticePeriod,   
        description: formValue.description,
        code: formValue.code,
        defaultDays: formValue.defaultDays,
      };
  
      if (this.isEditMode && this.editIndex !== null) {
       const id = this.leaveStructure[this.editIndex].id
       this.leaveStructure[this.editIndex] =  {
        id,
        ...newleaveStructure
       };
       this.paginatedLeaves[this.editIndex] =  {
        id,
        ...newleaveStructure
       };
       this.leaveService.addLeaveType({
        id,
        ...newleaveStructure
       }).subscribe(() => {
       this.messageService.add({ severity: 'success', summary: 'Success', detail: "Leave updated successfully!", key: 'tl', life: 3000  }); 
       this.leaveForm.reset();
       this.editIndex = null;
       })

      } else {
        this.leaveStructure.push(newleaveStructure);
        this.leaveService.addLeaveType(newleaveStructure).subscribe(() => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: "Leave added successfully!", key: 'tl', life: 3000  }); 
        this.leaveForm.reset();
        });
      }

     
  
      console.log('New Level Structure:', newleaveStructure);
    } else {
      console.error('Form is invalid');
    }
  }

  populateForm(leaveStructure: any, index: number) {
    this.isEditMode = true;
    this.editIndex = index;
    this.leaveForm.patchValue({
      leave: leaveStructure.name,
      leavePaidStatus: leaveStructure.payStatus,
      effectiveAfter: leaveStructure.effectiveAfter,
      allowedInProbation: leaveStructure.allowedInProbation,
      allowedInNoticePeriod: leaveStructure.allowedInNoticePeriod,   
      description: leaveStructure.description,
      code: leaveStructure.code,
      defaultDays: leaveStructure.defaultDays,
    });

 

  }

    toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  editSalary(leave: LeaveTypeDTO, index:number, event: Event) {
   
    event.stopPropagation();
    this.showAddForm = true
    this.editIndex = index
    this.populateForm(leave, index)
  }

  deleteSalary(leave: LeaveTypeDTO, index:number, event: Event) {

    this.leaveStructure.splice(index, 1);
    this.paginatedLeaves.splice(index, 1)
    this.leaveService.deleteLeaveType(leave.id).subscribe(() => {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: "Leave deleted successfully!", key: 'tl', life: 3000  }); 
    })
  }


  confirmSalaryDelete(leave: LeaveTypeDTO, i: number , event: Event): void {
    event.stopPropagation();

    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${leave.name}'s salary structure`,
      header: `Delete Salary Structure - ${leave.name}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancle p-button-text",
      acceptIcon:"none",
      rejectIcon:"none",
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        this.deleteSalary(leave, i , event);
      },
      reject: () => {

      }
    });
  }

  toogleForm() {
    
    this.showAddForm = !this.showAddForm
    if(this.isEditMode && this.showAddForm){
      this.leaveForm.reset();
    }
  }
}
