import { Component } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';

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
  ngOnInit(): void {
    const employee = localStorage.getItem("employeeInView");
    if (employee) {
      this.employeeInView = JSON.parse(employee);
    }
console.log(this.employeeInView)
    if(this.employeeInView.guarantor){
      this.onboardingStatus = "completed"
    }
    else{
      this.onboardingStatus = 'inProgress'
    }


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
