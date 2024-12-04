import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DomSanitizer } from '@angular/platform-browser';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { JobPostingCustomFieldDTO, JobPostingDTO } from '../../../domain/job.dto';
import { RecruitmentService } from '../../../service/recruitment.service';
import { stringify } from 'uuid';

@Component({
  selector: 'app-recruitment-form',
  templateUrl: './recruitment-form.component.html',
  styleUrl: './recruitment-form.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class RecruitmentFormComponent {
  @Output() back = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<any>();
  @Input() jobData: JobPostingDTO = {};
  @Input() isEdit?: boolean; 
  openSideModal?: boolean;
  customField: JobPostingCustomFieldDTO = {};
  customFieldList: JobPostingCustomFieldDTO[] = [];

  editIndex: number | null = null;

  customType = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'file', label: 'File' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'tel', label: 'Telephone' },
    { value: 'textarea', label: 'Textarea' },
  ];


  jobSpecifications = [
    'On-site',
    'Remote',
    'Hybrid',
    'Flexible'
  ];

  jobCategories: any[] = [];
  jobTypes: any[] = [];
  jobExperienceLevels: any[] = [];
  jobQualification: any[] = [];

  
  constructor(
    private sanitizer: DomSanitizer,
    private randomToken: RandomTokenService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private recruitmentService: RecruitmentService
  ) {

  }

  ngOnInit() {
    // if (!this.jobData.jobPostedDate) {
      this.getTodayDate(); 
    // }


    console.log("Check if isEdit is working",this.isEdit)

    this.loadJobCategories();
    this.loadJobTypes();
    this.loadJobExperiences();
    this.loadJobVacancyQualifications();
    this.loadJobVacancySpecifications();
    this.populateCustomFieldList();
  }

  loadJobCategories() {
    this.recruitmentService.getJobCategories().subscribe({
      next: (categories) => {
        this.jobCategories = categories;
        console.log('Job Categories:', this.jobCategories); // Log categories
      },
      error: (error) => console.error('Error loading job categories', error),
    });
  }

  loadJobTypes() {
    this.recruitmentService.getJobTypes().subscribe({
      next: (item) => {
        this.jobTypes = item;
        console.log('Job type:', this.jobTypes); // Log categories
      },
      error: (error) => console.error('Error loading job categories', error),
    });
  }

  loadJobExperiences() {
    this.recruitmentService.getJobVacancyExperiences().subscribe({
      next: (item) => {
        this.jobExperienceLevels = item;
        console.log('Job experience:', this.jobExperienceLevels); // Log categories
      },
      error: (error) => console.error('Error loading job categories', error),
    });
  }

  loadJobVacancyQualifications() {
    this.recruitmentService.getJobVacancyQualifications().subscribe({
      next: (item) => {
        this.jobQualification = item;
        console.log('Job qualification:', this.jobQualification); // Log categories
      },
      error: (error) => console.error('Error loading job categories', error),
    });
  }

  loadJobVacancySpecifications() {
    this.recruitmentService.getJobVacancySpecifications().subscribe({
      next: (item) => {
        this.jobSpecifications = item;
        console.log('Job specification:', this.jobSpecifications); // Log categories
      },
      error: (error) => console.error('Error loading job categories', error),
    });
  }

  onDeleteCustomiseInput(index: number): void {
    this.customFieldList?.splice(index, 1);
  }
 
  toggleSideModal(field?: JobPostingCustomFieldDTO, index?: number): void {
    this.openSideModal = true;
    if (!this.jobData.jobVacancyCustomFields) {
      this.customFieldList = [...(this.jobData.jobVacancyCustomFields || [])]; 
    }
    if (field && index !== undefined) {
      this.customField = { ...field }; 
      this.editIndex = index;
    } else {
      this.resetCustomField(); 
      this.editIndex = null; 
    }
  }

  populateCustomFieldList(): void {
    if (!this.jobData.jobVacancyCustomFields || this.jobData.jobVacancyCustomFields.length === 0) {
        console.warn("No custom fields available in jobData.jobVacancyCustomFields.");
        this.customFieldList = [];
        return;
    }

    const fetchRequests = this.jobData.jobVacancyCustomFields.map((FieldId) =>
        this.recruitmentService.getCustomFieldById(FieldId).toPromise()
    );

    Promise.all(fetchRequests)
      .then((fetchedFields) => {
          this.customFieldList = fetchedFields; // Populate the customFieldList with fetched data
          console.log("Custom fields successfully populated", fetchedFields);
      })
      .catch((err) => {
          console.error("Error fetching custom fields", err);
      });
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
  isValidCustomField(field: JobPostingCustomFieldDTO): boolean {
    return (
      !!field.label?.trim() && 
      !!field.type?.trim()
    );
  }
  resetCustomField(): void {
    this.customField = { label: '', type: '', required: false }; 
  }

  fieldsArray: JobPostingCustomFieldDTO[] = []
  saveCustomiseInputs(): void {
    // Make a copy of the custom field list
    this.fieldsArray = [...this.customFieldList];

    // Initialize an array to store responses
    const responseArray: any[] = [];

    // Make all service calls and collect responses
    const saveRequests = this.fieldsArray.map((field) =>
        this.recruitmentService.addJobVacncyCustomFieldss(field).toPromise()
    );

    // Wait for all requests to complete
    Promise.all(saveRequests)
      .then((responses) => {
          responseArray.push(...responses);

          // Save responses into jobData.jobVacancyCustomFields
          this.jobData.jobVacancyCustomFields = responseArray;

          // Save updated data to localStorage
          localStorage.setItem('customiseInputs', JSON.stringify(this.jobData.jobVacancyCustomFields));

          console.log("All fields successfully saved", responses);
      this.populateCustomFieldList()

      })
      .catch((err) => {
          console.error("Error saving one or more fields", err);
      })
      .finally(() => {
          // Close the side modal regardless of success or failure
          this.openSideModal = false;
      });


  }

  
  // saveCustomiseInputs(): void {
  //     this.jobData.fields = [...this.customFieldList]; 
  //     localStorage.setItem('customiseInputs', JSON.stringify(this.jobData.fields));
  
  //     this.openSideModal = false; 
  // }
  // generateRandomId(): number {
  //   return Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000; // Random number between 1000 and 9999
  // }
  // saveCustomFields(): void {
  //   const customFieldData: JobPostingCustomFieldDTO = { 
  //     id: this.generateRandomId(),
  //     label: this.customField.label, 
  //     type: this.customField.type, 
  //     required: this.customField.required 
  //   };

  //   if (this.editIndex !== null) {
  //     // Update logic: modify the custom field in your data array
  //     // Here, you can use this.editIndex to update the existing field in an array or object
  //     console.log('Updated custom field:', customFieldData);
  //   } else {
  //     // Add logic: you can either push this new custom field to an array or directly save it
  //     console.log('Added new custom field:', customFieldData);
  //   }

  //   // Call the service to save or update the custom field
  //   this.recruitmentService.addJobVacncyCustomFieldss(customFieldData)
  //     .subscribe({
  //       next: (response) => {
  //         console.log('Custom field saved successfully:', response);
  //         // Handle success (e.g., show a success message, navigate, etc.)
  //       },
  //       error: (error) => {
  //         console.error('Error saving custom field:', error);
  //         // Handle error (e.g., show an error message to the user)
  //       }
  //     });

  //     this.openSideModal = false; 
  // }

  getTodayDate() {
    const today = new Date();
    console.log("posted date", today);
    const unixTimestamp = today.getTime() / 1000; // Convert to Unix timestamp (seconds)
    this.jobData.jobPostedDate = unixTimestamp.toFixed(3); // Store as string
    console.log("posted date timestamp", this.jobData.jobPostedDate);
  }
  
  formatToDatetimeLocal(unixTimestamp: string): string {
    if (!unixTimestamp) return '';
    
    // Convert Unix timestamp (in seconds) to milliseconds
    const date = new Date(parseFloat(unixTimestamp) * 1000);
    
    // Format date to ISO 8601 string for datetime-local input
    return date.toISOString().slice(0, 16); // Keep only `yyyy-MM-ddTHH:mm`
  }
  jobExpiryDateInput: string = ''; // Holds the datetime-local value
// jobData: { jobExpiryDate: string } = { jobExpiryDate: '' }; // Holds the final Unix timestamp

onExpiryDateChange(value: string): void {
  if (value) {
    const date = new Date(value); // Convert the input value to a Date object
    const unixTimestamp = date.getTime() / 1000; // Convert to Unix timestamp in seconds
    this.jobData.jobExpiryDate = unixTimestamp.toFixed(3); // Store it as a string with 3 decimal places
    console.log("expiry date timestamp", this.jobData.jobExpiryDate)
  } else {
    this.jobData.jobExpiryDate = ''; // Reset if input is cleared
  }
}

  
  
  // getExpiryDate() {
  //   if (this.jobData.jobExpiryDate) {
  //     const expiryDate = new Date(this.jobData.jobExpiryDate); // Now it's safe to create a Date object
  //     const offsetDateString = `${expiryDate.toISOString().slice(0, 16)}+00:00`; // Custom offset if needed
  //     this.jobData.jobExpiryDate = new Date(offsetDateString); // Set as a Date object
  //   } 
  // }
  
  
  

  goBack() {
    this.back.emit();
  }
  
  // submitForm() {
  //   const isValid = this.validateForm();
  //   if (!isValid) {
  //     this.messageService.add({
  //       severity: 'error', 
  //       summary: 'Validation Failed',
  //       detail: 'Please fill out all fields before submitting the form.' 
  //     });    
  //     return; 
  //   }
  //   const storedJobs = localStorage.getItem('jobData');
  //   const jobArray = storedJobs ? JSON.parse(storedJobs) : [];
  
  //   if (this.isEdit) {
  //     const jobIndex = jobArray.findIndex((jobData: { id: number | undefined; }) => jobData.id === this.jobData.id);
  
  //     if (jobIndex > -1) {
  //       jobArray[jobIndex] = this.jobData;
  //       console.log('Job updated:', this.jobData);
  //     } else {
  //       console.error('Job not found for editing.');
  //     }
  //   } else {
  //     this.jobData.id = this.randomToken.getRandomToken(); 
  //     jobArray.push(this.jobData);
  //     console.log('Job added:', this.jobData);
  //   }
  //   localStorage.setItem('jobData', JSON.stringify(jobArray));
  
  //   this.submitFrom.emit(this.jobData);
  //   this.jobData = {}; 
  // }

  // prepareFormData() {
  //   const jobPostedDate = this.jobData.jobPostedDate 
  //   ? new Date(this.jobData.jobPostedDate).toISOString() 
  //   : null; // Handle undefined case
  // const jobExpiryDate = this.jobData.jobExpiryDate 
  //   ? new Date(this.jobData.jobExpiryDate).toISOString() 
  //   : null; // Handle undefined case
  
  //   return {
  //     ...this.jobData,
  //     jobPostedDate,
  //     jobExpiryDate,
  //   };
  // }

  onSubmitForm() {
    // const preparedData = this.prepareFormData();
    const isValid = this.validateForm();
    if (!isValid) {
      this.messageService.add({
        severity: 'error', 
        summary: 'Validation Failed',
        detail: 'Please fill out all fields before submitting the form.' 
      });    
      return; 
    }
  
    // Check if the job is being edited or added
    if (this.isEdit) {
      console.log('Job updated:', this.jobData);
    } else {
      // this.jobData.id = this.randomToken.getRandomToken(); 
      console.log('Job added:', this.jobData);
    }

    function isDate(value: any): value is Date {
      return value instanceof Date;
    }
    
    const jobPostedDate =
      this.jobData.jobPostedDate != null
        ? isDate(this.jobData.jobPostedDate)
          ? this.jobData.jobPostedDate.toISOString()
          : typeof this.jobData.jobPostedDate === 'number'
            ? new Date(this.jobData.jobPostedDate * 1000).toISOString()
            : this.jobData.jobPostedDate
        : null;

  // Prepare the data object, including jobPostedDate
  const data = {
    ...this.jobData,
    jobPostedDate
  };
  
    // Call the recruitment service to save the job data
    this.recruitmentService.addJobVacancy(data).subscribe(
      response => {
        console.log('Job saved successfully:', response);
        this.submitForm.emit(data);  // Emit the saved job data if needed
        this.jobData = {};  // Reset the form data after successful submission
      },
      error => {
        console.error('Error saving job:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error Saving Job',
          detail: 'There was an issue saving the job vacancy. Please try again later.'
        });
      }
    );
  }
  


  validateForm(): boolean {
    const requiredFields = [
      this.jobData.jobTitle,
      this.jobData.jobCategory,
      this.jobData.jobType,
      this.jobData.jobExpiryDate,
      this.jobData.companyOverview
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
