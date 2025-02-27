



import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-new-task',
  templateUrl: './new-task.component.html',
  styleUrls: ['./new-task.component.scss']
})
  

  
export class NewTaskComponent  {
  form!: FormGroup;
  dateError: string = ''; // Error message for invalid date selection
  visible: boolean = false;
  errors: any = {}; // Object to store validation errors
  today = new Date().getTime();

  task = {
    name: '',
    status: '',
    dueDate: '',
    priority: '',
    startDate: '',
    endDate: '',
    effortEstimation: '',
    selectedUsers: [] as string[]
  };

  users = [
    { email: 'user1@example.com' },
    { email: 'user2@example.com' },
    { email: 'user3@example.com' },
    { email: 'user4@example.com' }
  ];
  filteredUsers = [...this.users];
  searchQuery: string = '';

  openModal() {
    this.visible = true;
  }

  closeModal() {
    this.visible = false;
    this.errors = {}; // Clear errors when closing
  }
    validateDates(): boolean {
  const startDateValue = this.form.get('startDate')?.value;
  const endDateValue = this.form.get('endDate')?.value;

  if (!startDateValue || !endDateValue) {
    this.dateError = "Both start date and end date are required.";
    return false;
  }

  const startDate = new Date(startDateValue);
  const endDate = new Date(endDateValue);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    this.dateError = "Invalid date format.";
    return false;
  }

  if (endDate <= startDate) {
    this.dateError = "End date must be strictly greater than start date.";
    return false;
  }

  this.dateError = ''; // Clear error if validation passes
  return true;
}


  createTask() {
    this.errors = {}; // Reset previous errors

    // Validate all fields
    if (!this.task.name.trim()) this.errors.name = 'Task Name is required';
    if (!this.task.status) this.errors.status = 'Status is required';
    if (!this.task.dueDate) this.errors.dueDate = 'Due Date is required';
    if (!this.task.priority) this.errors.priority = 'Priority is required';
    if (!this.task.startDate) this.errors.timeline = 'Start Date is required';
    if (!this.task.endDate) this.errors.timelinetwo = 'End Date is required';
    if (!this.task.effortEstimation) this.errors.effortEstimation = 'Effort is required';
    if (this.task.selectedUsers.length === 0) this.errors.selectedUsers = 'At least one user must be selected';

    // If errors exist, stop execution
    if (Object.keys(this.errors).length > 0) {
      return;
    }
 
    

    localStorage.setItem('task', JSON.stringify(this.task));
    console.log('Task saved:', this.task);

    this.closeModal(); // Close modal after saving
  }

  filterUsers() {
    this.filteredUsers = this.users.filter(user =>
      user.email.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  addUser(email: string) {
    if (!this.task.selectedUsers.includes(email)) {
      this.task.selectedUsers.push(email);
    }
    this.searchQuery = ''; // Clear search after adding
  }
}




















// import { Component, EventEmitter, Output } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// @Component({
//   selector: 'app-new-task',
//   templateUrl: './new-task.component.html',
//   styleUrls: ['./new-task.component.scss']
// })
// export class NewTaskComponent {
//   @Output() taskCreated = new EventEmitter<any>(); // Emit the created task
//   form!: FormGroup;
//   dateError: string = '';
//   visible: boolean = false;
//   errors: any = {};
//   today = new Date().getTime();

//   task = {
//     name: '',
//     status: '',
//     dueDate: '',
//     priority: '',
//     startDate: '',
//     endDate: '',
//     effortEstimation: '',
//     selectedUsers: [] as string[]
//   };

//   users = [
//     { email: 'user1@example.com' },
//     { email: 'user2@example.com' },
//     { email: 'user3@example.com' },
//     { email: 'user4@example.com' }
//   ];
//   filteredUsers = [...this.users];
//   searchQuery: string = '';

//   openModal() {
//     this.visible = true;
//   }

//   closeModal() {
//     this.visible = false;
//     this.errors = {};
//   }

//   validateDates(): boolean {
//     const startDateValue = this.form.get('startDate')?.value;
//     const endDateValue = this.form.get('endDate')?.value;

//     if (!startDateValue || !endDateValue) {
//       this.dateError = "Both start date and end date are required.";
//       return false;
//     }

//     const startDate = new Date(startDateValue);
//     const endDate = new Date(endDateValue);

//     if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
//       this.dateError = "Invalid date format.";
//       return false;
//     }

//     if (endDate <= startDate) {
//       this.dateError = "End date must be strictly greater than start date.";
//       return false;
//     }

//     this.dateError = '';
//     return true;
//   }

//   createTask() {
//     this.errors = {};

//     // Validate all fields
//     if (!this.task.name.trim()) this.errors.name = 'Task Name is required';
//     if (!this.task.status) this.errors.status = 'Status is required';
//     if (!this.task.dueDate) this.errors.dueDate = 'Due Date is required';
//     if (!this.task.priority) this.errors.priority = 'Priority is required';
//     if (!this.task.startDate) this.errors.timeline = 'Start Date is required';
//     if (!this.task.endDate) this.errors.timelinetwo = 'End Date is required';
//     if (!this.task.effortEstimation) this.errors.effortEstimation = 'Effort is required';
//     if (this.task.selectedUsers.length === 0) this.errors.selectedUsers = 'At least one user must be selected';

//     if (Object.keys(this.errors).length > 0) {
//       return;
//     }

//     // Emit the created task
//     this.taskCreated.emit(this.task);
//     this.closeModal();
//   }

//   filterUsers() {
//     this.filteredUsers = this.users.filter(user =>
//       user.email.toLowerCase().includes(this.searchQuery.toLowerCase())
//     );
//   }

//   addUser(email: string) {
//     if (!this.task.selectedUsers.includes(email)) {
//       this.task.selectedUsers.push(email);
//     }
//     this.searchQuery = '';
//   }
// }