import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

@Component({
  selector: 'app-add-per-diem',
  templateUrl: './add-per-diem.component.html',
  styleUrls: ['./add-per-diem.component.scss']
})
export class AddPerDiemComponent implements OnInit {
  perDiemForm!: FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.perDiemForm = this.fb.group({
      perDiemType: ['trip', Validators.required], // Default to 'trip'
      tripFrom: [''],
      tripStartDate: [''],
      tripStartTime: [''],
      tripTo: [''],
      tripEndDate: [''],
      tripEndTime: [''],
      destinations: this.fb.array([this.createDestination()]), // Initial destination
      dayDate: [''],
      dayAmount: [''],
      category: [''],
      project: [''],
      comment: ['']
    });
  }

  // Create a new destination FormGroup
  createDestination(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      endDate: ['', Validators.required],
      time: ['', Validators.required]
    });
  }
  
  // Get the destinations FormArray
  get destinations(): FormArray {
    return this.perDiemForm.get('destinations') as FormArray;
  }

  // Add a new destination
  addDestination() {
    this.destinations.push(this.createDestination());
  }

  // Remove a destination at a specific index
  removeDestination(index: number) {
    this.destinations.removeAt(index);
  }

  // Handle form submission
  submitPerDiem() {
    if (this.perDiemForm.valid) {
      console.log('Form Submitted', this.perDiemForm.value);
    } else {
      console.log('Form is invalid');
    }
  }
}
