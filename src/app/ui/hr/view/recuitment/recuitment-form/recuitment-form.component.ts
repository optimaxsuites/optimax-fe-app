import { Component, EventEmitter, Input, Output } from '@angular/core';
import { customiseInputDTO, JobDTO } from '../../../domain/job.dto';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RandomTokenService } from 'src/app/ui/shared/service/random-token/random-token.service';
import { ConfirmationService, MessageService } from 'primeng/api';

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
  customiseInput: customiseInputDTO = {};
  customiseInputList: customiseInputDTO[] = [];

  customiseInputType = [
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
    // Initialize jobData with a default string
  }



  // Method to add a new input to the list
  addCustomiseInput() {
    this.customiseInputList.push({ ...this.customiseInput });
    this.customiseInput = {}; // Reset input fields
  }

  // Method to save inputs to localStorage
  saveCustomiseInputs() {
    localStorage.setItem('customiseInputs', JSON.stringify(this.customiseInputList));
    
    // Clear the list after saving
    this.customiseInputList = []; 
    
    // Load the saved customiseInputs from local storage and parse them
    const savedCustomiseInputs = localStorage.getItem('customiseInputs');
    
    // Check if saved data exists and parse it
    if (savedCustomiseInputs) {
        this.jobData.customiseInput = JSON.parse(savedCustomiseInputs);
    } else {
        this.jobData.customiseInput = []; // Initialize as an empty array if nothing is found
    }
    this.openSideModal = false;
}


  toogleSideModal(){
    this.openSideModal = true;
  }

  // In your ngOnInit or constructor, set the current date as the posted date
  ngOnInit() {
    if (!this.jobData.postedDate) {
      this.getTodayDate(); // Set today's date if not already set
    }

    console.log("Check if isEdit is working",this.isEdit)
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
}
