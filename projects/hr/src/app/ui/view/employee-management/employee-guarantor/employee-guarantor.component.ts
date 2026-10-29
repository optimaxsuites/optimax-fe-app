import { Component } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { EmployeeService } from '../../../service/employee.service';

@Component({
  selector: 'app-employee-guarantor',
  templateUrl: './employee-guarantor.component.html',
  styleUrl: './employee-guarantor.component.scss'
})
export class EmployeeGuarantorComponent {
  employeeInView: any; 
  onboardingStatus: any;
  fileDataUrl: SafeUrl = '';
  imageURL: string =''
  showModal: boolean = false;
  currentFile: string = '';

  constructor(private employeeService: EmployeeService) {}

  ngOnInit(): void {
    // Fetched fresh rather than read from localStorage's copy, which goes stale (and used to
    // crash this tab on null.guarantor when it was missing).
    this.employeeService.getEmployeeInView().subscribe((employee) => {
      this.employeeInView = employee;
      const guarantors = employee?.guarantor;
      this.onboardingStatus = Array.isArray(guarantors) && guarantors.length ? "completed" : 'inProgress';
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
