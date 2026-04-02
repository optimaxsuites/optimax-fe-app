import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CustomField, JobDTO } from '../../../domain/job.dto';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RandomTokenService } from 'src/app/ui/shared/service/random-token/random-token.service';
import { ConfirmationService, MessageService } from 'primeng/api';

type DropdownKind = 'category' | 'employmentType' | 'experience' | 'qualification' | 'specification';

@Component({
  selector: 'app-recuitment-form',
  templateUrl: './recuitment-form.component.html',
  styleUrl: './recuitment-form.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class RecuitmentFormComponent {
  @Output() back = new EventEmitter<void>();
  @Output() submitFrom = new EventEmitter<JobDTO>();
  @Input() jobData: JobDTO = {};
  @Input() isEdit?: boolean; 
  openSideModal?: boolean;
  openAddDropdownModal = false;
  addDropdownKind: DropdownKind = 'category';
  newDropdownValue = '';
  customField: CustomField = {};
  customFieldList: CustomField[] = [];

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

  jobCategories: string[] = [
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

  jobTypes: string[] = [
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

  experienceLevels: string[] = [
    '0-1 Year',
    '2-4 Years',
    '5+ Years'
  ];

  jobSpecifications: string[] = [
    'On-site',
    'Remote',
    'Hybrid',
    'Flexible'
  ];

  jobQualification: string[] = [
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
    // Initialize jobData with a default string
  }

  ngOnInit() {
    this.restoreDropdownOptions();
    if (!this.jobData.postedDate) {
      this.getTodayDate(); // Set today's date if not already set
    }

    console.log("Check if isEdit is working",this.isEdit)
  }

  get addDropdownTitle(): string {
    switch (this.addDropdownKind) {
      case 'category':
        return 'Category';
      case 'employmentType':
        return 'Job Type';
      case 'experience':
        return 'Experience';
      case 'qualification':
        return 'Qualification';
      case 'specification':
        return 'Specification';
      default:
        return 'Item';
    }
  }

  openAddDropdown(kind: DropdownKind) {
    this.addDropdownKind = kind;
    this.newDropdownValue = '';
    this.openAddDropdownModal = true;
  }

  closeAddDropdown() {
    this.openAddDropdownModal = false;
    this.newDropdownValue = '';
  }

  addDropdownValue() {
    const value = (this.newDropdownValue || '').trim();
    if (!value) {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing name',
        detail: 'Please enter a name.',
      });
      return;
    }

    const list = this.getDropdownList(this.addDropdownKind);
    const exists = list.some((item) => item.trim().toLowerCase() === value.toLowerCase());
    if (exists) {
      this.messageService.add({
        severity: 'info',
        summary: 'Already exists',
        detail: `"${value}" already exists in ${this.addDropdownTitle}.`,
      });
      this.setJobDataField(this.addDropdownKind, value);
      this.closeAddDropdown();
      return;
    }

    list.push(value);
    this.persistDropdownList(this.addDropdownKind, list);
    this.setJobDataField(this.addDropdownKind, value);

    this.messageService.add({
      severity: 'success',
      summary: 'Added',
      detail: `"${value}" added to ${this.addDropdownTitle}.`,
    });

    this.closeAddDropdown();
  }

  private restoreDropdownOptions() {
    this.jobCategories = this.readStoredOptions('recruitment.jobCategories', this.jobCategories);
    this.jobTypes = this.readStoredOptions('recruitment.jobTypes', this.jobTypes);
    this.experienceLevels = this.readStoredOptions('recruitment.experienceLevels', this.experienceLevels);
    this.jobQualification = this.readStoredOptions('recruitment.jobQualification', this.jobQualification);
    this.jobSpecifications = this.readStoredOptions('recruitment.jobSpecifications', this.jobSpecifications);
  }

  private readStoredOptions(storageKey: string, fallback: string[]): string[] {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return fallback;
      const cleaned = parsed
        .filter((v) => typeof v === 'string')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      // Keep stable order while removing duplicates (case-insensitive)
      const seen = new Set<string>();
      const unique: string[] = [];
      for (const item of cleaned) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }
      return unique.length > 0 ? unique : fallback;
    } catch {
      return fallback;
    }
  }

  private persistDropdownList(kind: DropdownKind, list: string[]) {
    try {
      localStorage.setItem(this.getDropdownStorageKey(kind), JSON.stringify(list));
    } catch {
      // ignore storage failures
    }
  }

  private getDropdownStorageKey(kind: DropdownKind): string {
    switch (kind) {
      case 'category':
        return 'recruitment.jobCategories';
      case 'employmentType':
        return 'recruitment.jobTypes';
      case 'experience':
        return 'recruitment.experienceLevels';
      case 'qualification':
        return 'recruitment.jobQualification';
      case 'specification':
        return 'recruitment.jobSpecifications';
      default:
        return 'recruitment.dropdown';
    }
  }

  private getDropdownList(kind: DropdownKind): string[] {
    switch (kind) {
      case 'category':
        return this.jobCategories;
      case 'employmentType':
        return this.jobTypes;
      case 'experience':
        return this.experienceLevels;
      case 'qualification':
        return this.jobQualification;
      case 'specification':
        return this.jobSpecifications;
      default:
        return [];
    }
  }

  private setJobDataField(kind: DropdownKind, value: string) {
    switch (kind) {
      case 'category':
        this.jobData.category = value;
        break;
      case 'employmentType':
        this.jobData.employmentType = value;
        break;
      case 'experience':
        this.jobData.experience = value;
        break;
      case 'qualification':
        this.jobData.qualification = value;
        break;
      case 'specification':
        this.jobData.specification = value;
        break;
    }
  }

  onDeleteCustomiseInput(index: number): void {
    this.jobData.fields?.splice(index, 1);
  }
  

  // Method to add a new input to the list
  addCustomiseInput() {
    this.customFieldList.push({ ...this.customField });
    this.customField = {}; // Reset input fields
  }

  // Method to save inputs to localStorage
  saveCustomiseInputs() {
    localStorage.setItem('customiseInputs', JSON.stringify(this.customFieldList));
    
    // Clear the list after saving
    this.customFieldList = []; 
    
    // Load the saved customiseInputs from local storage and parse them
    const savedCustomiseInputs = localStorage.getItem('customiseInputs');
    
    // Check if saved data exists and parse it
    if (savedCustomiseInputs) {
        this.jobData.fields = JSON.parse(savedCustomiseInputs);
    } else {
        this.jobData.fields = []; // Initialize as an empty array if nothing is found
    }
    this.openSideModal = false;
}


  toogleSideModal(){
    this.openSideModal = true;
  }


  getTodayDate(){
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
    const day = String(today.getDate()).padStart(2, '0'); // Get the day
    const year = today.getFullYear(); // Get the year
  
    this.jobData.postedDate = `${month}/${day}/${year}`; // Format as MM/DD/YYYY
  }

  goBack() {
    this.back.emit();
  }

  
  submitForm() {
    // Check if all required fields are filled
    const isValid = this.validateForm();
    if (!isValid) {
      this.messageService.add({
        severity: 'error', 
        summary: 'Validation Failed',
        detail: 'Please fill out all fields before submitting the form.' 
      });    
      return; 
    }
    
    // Retrieve the existing job postings from localStorage (if any)
    const storedJobs = localStorage.getItem('jobData');
    const jobArray = storedJobs ? JSON.parse(storedJobs) : [];
  
    if (this.isEdit) {
      // Find the index of the job to be edited
      const jobIndex = jobArray.findIndex((jobData: { id: number | undefined; }) => jobData.id === this.jobData.id);
  
      if (jobIndex > -1) {
        // Update the existing job data
        jobArray[jobIndex] = this.jobData;
        console.log('Job updated:', this.jobData);
      } else {
        console.error('Job not found for editing.');
      }
    } else {
      // Generate a random token and append it to the job ID for new job submissions
      this.jobData.id = this.randomToken.getRandomToken(); // Add token to the ID
  
      // Add the new job data to the array
      jobArray.push(this.jobData);
      console.log('Job added:', this.jobData);
    }
  
    // Save the updated array back to localStorage
    localStorage.setItem('jobData', JSON.stringify(jobArray));
  
    // Emit the form submission event (if required)
    this.submitFrom.emit(this.jobData);
  
    // Optionally, reset the form after submission
    this.jobData = {}; // Reset the job data
  }

  // Validation function
  validateForm(): boolean {
    // Check if required fields are filled
    const requiredFields = [
      this.jobData.title,
      this.jobData.category,
      this.jobData.employmentType,
      this.jobData.expiryDate,
      this.jobData.description
    ];

    return requiredFields.every(field => field); // Ensure all required fields are truthy
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








