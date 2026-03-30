


import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project',
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
})
export class ProjectComponent implements OnInit {
  form!: FormGroup;
  imageUrl: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  dateError: string = ''; // Error message for invalid date selection

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      category: ['', Validators.required],
      priority: ['', Validators.required],
      budget: ['', [Validators.required, Validators.min(1)]],
      template: ['', Validators.required],
      assignee: ['', Validators.required],
      projectImage: [null, Validators.required],
      createdAt: [new Date()],
      updatedAt: [new Date()],
    });
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


  onFileChange(event: any): void {
    const file = event.target.files[0];

    if (file) {
      this.selectedFile = file;
      this.form.patchValue({ projectImage: file });

      const reader = new FileReader();
      reader.onload = (e) => (this.imageUrl = reader.result);
      reader.readAsDataURL(file);
    }
  }

  saveProject(): void {
    this.form.markAllAsTouched(); // Ensure all fields show validation errors if invalid

    if (!this.validateDates()) {
      return; // Stop form submission if dates are incorrect
    }

    if (this.form.invalid) {
      return; // Prevent submission if other fields are invalid
    }

    const storedData = localStorage.getItem('projectData');
    const existingProjects = storedData ? JSON.parse(storedData) : [];

    const projectsArray = Array.isArray(existingProjects) ? existingProjects : [existingProjects];

    const newProject = {
      id: this.generateRandomId(),
      ...this.form.value,
      projectImage: this.imageUrl,
    };

    projectsArray.push(newProject);

    localStorage.setItem('projectData', JSON.stringify(projectsArray));

    alert('Project saved successfully!');
    this.router.navigate(['admin/productivity/4032e3b6-ea0e-480f-9c98-bbe10d67cee2/project-list']);
  }

  generateRandomId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  goBack(): void {
    this.router.navigate(['admin/productivity/4032e3b6-ea0e-480f-9c98-bbe10d67cee2/project-list']);
  }
}




