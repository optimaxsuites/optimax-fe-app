import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-report',
  templateUrl: './create-report.component.html',
  styleUrls: ['./create-report.component.scss'],
})
export class CreateReportComponent implements OnInit {
  //@ts-ignore
  reportForm: FormGroup;
  uploadedFile: File | null = null;

  reportTypes: Array<{ value: string; label: string }> = [
    { value: 'sales', label: 'Sales Report' },
    { value: 'inventory', label: 'Inventory Report' },
    { value: 'financial', label: 'Financial Report' },
    // Additional types can be added here
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.reportForm = this.fb.group({
      reportName: ['', Validators.required],
      reportType: ['', Validators.required],
      reportDuration: ['', Validators.required],
      // For custom duration, dates become required. You may add conditional validation if needed.
      startDate: [null],
      endDate: [null],
      additionalInfo: [''],
    });
  }

  onFileChange(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.uploadedFile = event.target.files[0];
      console.log('Uploaded file:', this.uploadedFile);
    }
  }

  onSubmit(): void {
    if (this.reportForm.valid) {
      const formData = {
        ...this.reportForm.value,
        dataFile: this.uploadedFile,
      };
      console.log('Report Data:', formData);
      // Integrate your service call here to process report creation.
    }
  }
}
