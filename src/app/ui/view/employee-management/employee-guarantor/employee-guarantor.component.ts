import { Component, OnInit } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { EmployeeService } from '../../../service/employee.service';
import { SelectedEmployeeStore } from '../selected-employee.store';

@Component({
  selector: 'app-employee-guarantor',
  templateUrl: './employee-guarantor.component.html',
  styleUrl: './employee-guarantor.component.scss'
})
export class EmployeeGuarantorComponent implements OnInit {
  employeeInView: any;
  onboardingStatus: 'loading' | 'missing' | 'error' | 'inProgress' | 'completed' = 'loading';
  guarantors: any[] = [];
  fileDataUrl: SafeUrl = '';
  imageURL: string =''
  showModal: boolean = false;
  currentFile: string = '';

  constructor(
    private employeeService: EmployeeService,
    private selectedEmployee: SelectedEmployeeStore
  ) {}

  ngOnInit(): void {
    this.employeeInView = this.selectedEmployee.get();
    const id = this.selectedEmployee.id;
    if (id === null) {
      this.onboardingStatus = 'missing';
      return;
    }

    this.employeeService.getGuarantor(id).subscribe({
      next: (res: any) => {
        this.guarantors = Array.isArray(res) ? res : (res?.content ?? []);
        this.onboardingStatus = this.guarantors.length ? 'completed' : 'inProgress';
      },
      error: () => {
        this.onboardingStatus = 'error';
      }
    });
  }

  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }
  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  isFile(value: any): boolean {
    return typeof value === 'string' && value.startsWith('data:image/');
  }

  previewFile(fileUrl: string) {
    if (fileUrl) {
      this.fileDataUrl = fileUrl;
      this.showModal = true;
    }
  
  }
  openFileInModal(fileUrl: string) {
    this.currentFile = fileUrl;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.fileDataUrl = '';
  }
}
