import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CustomField, JobDTO } from '../../../domain/job.dto';
import { DomSanitizer } from '@angular/platform-browser';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { BackButtonComponent } from '../../../shared-component/view/back-button/back-button.component';

@Component({
  selector: 'app-recruitment-form',
  templateUrl: './recruitment-form.component.html',
  styleUrl: './recruitment-form.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class RecruitmentFormComponent {
  @Output() back = new EventEmitter<void>();
  @Output() submitFrom = new EventEmitter<JobDTO>();
  @Input() jobData: JobDTO = {};
  @Input() isEdit?: boolean; 
  openSideModal?: boolean;
  customField: CustomField = {};
  customFieldList: CustomField[] = [];

  editIndex: number | null = null;

  customType = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'file', label: 'File' },
    { value: 'email', label: 'Email' },
    { value: 'password', label: 'Password' },
    { value: 'date', label: 'Date' },
    { value: 'datetime-local', label: 'Date & Time' },
    { value: 'time', label: 'Time' },
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'url', label: 'URL' },
    { value: 'tel', label: 'Telephone' },
    { value: 'color', label: 'Color' },
    { value: 'range', label: 'Range' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio' },
    { value: 'textarea', label: 'Textarea' },
  ];

  jobCategories = [
    'Accounting',
    'Administration',
    'Advertising',
    'Aerospace',
    'Agriculture',
    'Arts and Entertainment',
    'Automotive',
    'Banking',
    'Biotechnology',
    'Business Development',
    'Construction',
    'Consulting',
    'Customer Service',
    'Data Analyst',
    'Software Developer',
    'Project Manager',
    'Graphic Designer',
    'Marketing Specialist',
    'Sales Representative',
    'Human Resources Manager',
    'Financial Analyst',
    'Business Analyst',
    'Network Administrator',
    'Content Writer',
    'Customer Support Specialist',
    'Research Scientist',
    'Web Developer',
    'Mobile App Developer',
    'Data Scientist',
    'System Administrator',
    'UX/UI Designer',
    'Quality Assurance Tester',
    'IT Support Technician',
    'Database Administrator',
    'DevOps Engineer',
    'Social Media Manager',
    'Brand Manager',
    'Compliance Officer',
    'Event Planner',
    'SEO Specialist',
    'Digital Marketing Manager',
    'Operations Manager',
    'Teacher/Educator',
    'Healthcare',
    'Hospitality',
    'Medical Professional (e.g., Doctor, Nurse)',
    'Legal Advisor',
    'Supply Chain Manager',
    'Product Manager',
    'Construction Manager',
    'Chemist',
    'Electrical Engineer',
    'Civil Engineer',
    'Mechanical Engineer',
    'Architect',
    'Information Security Analyst',
    'Data Entry Clerk',
    'Real Estate Agent',
    'Copywriter',
    'Web Content Manager',
    'Public Relations Specialist',
    'Product Designer',
    'Research Assistant',
    'Insurance Underwriter',
    'Nonprofit',
    'Pharmaceuticals',
    'Project Management',
    'Retail',
    'Science',
    'Security',
    'Social Services',
    'Telecommunications',
    'Transportation',
    'Travel and Tourism',
    'Writing and Editing'
  ];

  jobTypes = [
    'Full-time',
    'Part-time',
    'Contract',
    'Temporary',
    'Internship',
    'Freelance',
    'Commission-based',
    'Volunteer',
    'Seasonal',
    'Project-based',
    'Flexible'
  ];

  experienceLevels = [
    '0-1 Year',
    '2-4 Years',
    '5+ Years'
  ];

  jobSpecifications = [
    'On-site',
    'Remote',
    'Hybrid',
    'Flexible'
  ];

  jobQualification = [
    'High School Diploma',
    'Associate\'s Degree',
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'Doctorate (PhD)',
    'Professional Certification (e.g., PMP, CPA, Six Sigma)',
    'Vocational Training',
    'Certificate Program (e.g., ITIL, AWS Certified)',
    'Trade Certification',
    'Apprenticeship',
    'GED (General Educational Development)',
    'Diploma (various fields)',
    'Licensed (e.g., Medical Doctor, Nurse)',
    'Certified (e.g., Certified Public Accountant)',
    'Specialized Training (e.g., Software Development Bootcamp)',
    'Continuous Professional Development (CPD)',
    'Language Proficiency (e.g., TOEFL, IELTS)',
    'Leadership Training',
    'Technical Certification (e.g., Cisco, Microsoft)',
    'Safety Training (e.g., OSHA)'
  ];
  
  constructor(
    private sanitizer: DomSanitizer,
    private randomToken: RandomTokenService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {

  }

  ngOnInit() {
    if (!this.jobData.postedDate) {
      this.getTodayDate(); 
    }


    console.log("Check if isEdit is working",this.isEdit)
  }

  onDeleteCustomiseInput(index: number): void {
    this.customFieldList?.splice(index, 1);
  }
 
  toggleSideModal(field?: CustomField, index?: number): void {
    this.openSideModal = true;
    if (!this.jobData.fields) {
      this.customFieldList = [...(this.jobData.fields || [])]; 
    }
    if (field && index !== undefined) {
      this.customField = { ...field }; 
      this.editIndex = index;
    } else {
      this.resetCustomField(); 
      this.editIndex = null; 
    }
  }
  
  onEditCustomInput(index: number): void {
    this.customField = { ...this.customFieldList[index] };
    this.editIndex = index; 
    this.openSideModal = true; 
  }
  addOrUpdateCustomField(): void {
    if (this.isValidCustomField(this.customField)) {
      if (this.editIndex !== null) {
        this.customFieldList[this.editIndex] = { ...this.customField };
      } else {
        this.customFieldList.push({ ...this.customField });
      }
      this.resetCustomField();
      this.editIndex = null; 
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Failed',
        detail: 'Please fill out all fields correctly.',
      });
    }
  }
  isValidCustomField(field: CustomField): boolean {
    return (
      !!field.label?.trim() && 
      !!field.type?.trim()
    );
  }
  resetCustomField(): void {
    this.customField = { label: '', type: '', required: false }; 
  }
  
  saveCustomiseInputs(): void {
      this.jobData.fields = [...this.customFieldList]; 
      localStorage.setItem('customiseInputs', JSON.stringify(this.jobData.fields));
  
      this.openSideModal = false; 
  }

  getTodayDate(){
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
  
    this.jobData.postedDate = `${month}/${day}/${year}`; // MM/DD/YYYY
  }

  goBack() {
    this.back.emit();
  }
  
  submitForm() {
    const isValid = this.validateForm();
    if (!isValid) {
      this.messageService.add({
        severity: 'error', 
        summary: 'Validation Failed',
        detail: 'Please fill out all fields before submitting the form.' 
      });    
      return; 
    }
    const storedJobs = localStorage.getItem('jobData');
    const jobArray = storedJobs ? JSON.parse(storedJobs) : [];
  
    if (this.isEdit) {
      const jobIndex = jobArray.findIndex((jobData: { id: number | undefined; }) => jobData.id === this.jobData.id);
  
      if (jobIndex > -1) {
        jobArray[jobIndex] = this.jobData;
        console.log('Job updated:', this.jobData);
      } else {
        console.error('Job not found for editing.');
      }
    } else {
      this.jobData.id = this.randomToken.getRandomToken(); 
      jobArray.push(this.jobData);
      console.log('Job added:', this.jobData);
    }
    localStorage.setItem('jobData', JSON.stringify(jobArray));
  
    this.submitFrom.emit(this.jobData);
    this.jobData = {}; 
  }


  validateForm(): boolean {
    const requiredFields = [
      this.jobData.title,
      this.jobData.category,
      this.jobData.employmentType,
      this.jobData.expiryDate,
      this.jobData.description
    ];

    return requiredFields.every(field => field); 
  }







// jobData: any = {
//   title: '',
//   category: '',
//   employmentType: '',
//   location: '',
//   experience: '',
//   qualification: '',
//   specification: '',
//   postedDate: new Date(),
//   expiryDate: '',
//   description: '',
//   customiseInput: []
// };
// customiseInput: any = { title: '', type: '', required: false };
// customiseInputList: any[] = [];
// jobCategories = []; // Your job categories here
// jobTypes = [];      // Your job types here
// experienceLevels = []; // Experience levels here
// jobQualification = []; // Job qualifications here
// jobSpecifications = []; // Job specifications here
// customiseInputType = [
//   { label: 'Text', value: 'text' },
//   { label: 'Textarea', value: 'textarea' },
//   { label: 'Select', value: 'select' }
// ];
// openSideModal = false;
// isEdit = false;

// ngOnInit(): void {
//   this.loadJobData();
// }

// submitForm(): void {
//   // Save job data to local storage
//   localStorage.setItem('jobData', JSON.stringify(this.jobData));
//   this.showSuccessMessage("Job vacancy info saved successfully!");
// }

// loadJobData(): void {
//   const savedJobData = localStorage.getItem('jobData');
//   if (savedJobData) {
//     this.jobData = JSON.parse(savedJobData);
//   }
// }

// addCustomiseInput(): void {
//   this.jobData.customiseInput.push({...this.customiseInput});
//   this.customiseInput = { title: '', type: '', required: false }; // Reset input field after adding
// }

// toogleSideModal(): void {
//   this.openSideModal = !this.openSideModal;
// }

// onDeleteCustomiseInput(index: number): void {
//   this.jobData.customiseInput.splice(index, 1);
// }

// saveCustomiseInputs(): void {
//   // Save the customize input list and close the modal
//   this.customiseInputList = [...this.jobData.customiseInput];
//   this.openSideModal = false;
// }

// showSuccessMessage(message: string): void {
//   // Display a success message (You can implement this using a Toast or Snackbar)
//   console.log(message);
// }



}
