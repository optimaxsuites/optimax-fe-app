
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-new-task',
  templateUrl: './new-task.component.html',
  styleUrls: ['./new-task.component.scss'],
})
export class NewTaskComponent implements OnInit {
  @Output() taskCreated = new EventEmitter<any>(); // Emit the created task

  form!: FormGroup;
  dateError: string = '';
  visible: boolean = false;
  errors: any = {};
  today = new Date().getTime();
  message: string = '';

  task = {
    id: '',
    name: '',
    status: '',
    dueDate: '',
    priority: '',
    startDate: '',
    endDate: '',
    effortEstimation: '',
    selectedUsers: [] as string[],
    projectId: '' // Add projectId to the task
  };

  users = [
    { email: 'user1@example.com' },
    { email: 'user2@example.com' },
    { email: 'user3@example.com' },
    { email: 'user4@example.com' }
  ];
  filteredUsers = [...this.users];
  searchQuery: string = '';

  constructor(
    private fb: FormBuilder,
    public ref: DynamicDialogRef, // Inject DynamicDialogRef
    public config: DynamicDialogConfig // Inject DynamicDialogConfig
  ) {
    // Initialize the form with validators if needed
    this.form = this.fb.group({
      name: ['', Validators.required],
      status: ['', Validators.required],
      dueDate: ['', Validators.required],
      priority: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      effortEstimation: ['', Validators.required],
      selectedUsers: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    // Retrieve projectId from the config data
    this.task.projectId = this.config.data.projectId;
    console.log('Project ID in NewTaskComponent:', this.task.projectId); // Log projectId to verify
  }

  openModal() {
    this.visible = true;
  }

  closeModal() {
    this.visible = false;
    this.errors = {};
    this.message = '';
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

    this.dateError = '';
    return true;
  }

  createTask() {
    this.errors = {};

    // Validate all fields
    if (!this.task.name.trim()) this.errors.name = 'Task Name is required';
    if (!this.task.status) this.errors.status = 'Status is required';
    if (!this.task.dueDate) this.errors.dueDate = 'Due Date is required';
    if (!this.task.priority) this.errors.priority = 'Priority is required';
    if (!this.task.startDate) this.errors.timeline = 'Start Date is required';
    if (!this.task.endDate) this.errors.timelinetwo = 'End Date is required';
    if (!this.task.effortEstimation) this.errors.effortEstimation = 'Effort is required';
    if (this.task.selectedUsers.length === 0) this.errors.selectedUsers = 'At least one user must be selected';

    if (Object.keys(this.errors).length > 0) {
      return;
    }

    // Generate unique ID for the task
    this.task.id = this.generateUniqueId();

    // Log the task object to verify projectId is included
    console.log('Task being created:', this.task);

    // Save task to local storage
    const success = this.saveTaskToLocalStorage(this.task);

    if (success) {
      this.message = 'Task successfully created!';
      this.resetTask();
      this.closeModal();
      this.ref.close(this.task); // Close the modal and return the task
    } else {
      this.message = 'Failed to create the task. Please try again.';
    }
  }

  generateUniqueId(): string {
    return 'task-' + Math.random().toString(36).substr(2, 9);
  }

  saveTaskToLocalStorage(task: any): boolean {
    try {
      let tasks = JSON.parse(localStorage.getItem('tasks') || '{}');
      tasks[task.id] = task;
      localStorage.setItem('tasks', JSON.stringify(tasks));

      // Also, update the project's tasks in localStorage
      const storedData = localStorage.getItem('projectData');
      if (storedData) {
        const projects: any[] = JSON.parse(storedData);
        const project = projects.find((p) => p.id === task.projectId);
        if (project) {
          if (!project.tasks) {
            project.tasks = [];
          }
          project.tasks.push(task);
          localStorage.setItem('projectData', JSON.stringify(projects));
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving task:', error);
      return false;
    }
  }

  resetTask() {
    this.task = {
      id: '',
      name: '',
      status: '',
      dueDate: '',
      priority: '',
      startDate: '',
      endDate: '',
      effortEstimation: '',
      selectedUsers: [],
      projectId: this.task.projectId // Preserve the projectId
    };
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
    this.searchQuery = '';
  }
}