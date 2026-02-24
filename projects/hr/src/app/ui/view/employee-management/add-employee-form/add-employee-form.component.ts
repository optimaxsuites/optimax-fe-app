import { Component, OnInit , Input } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl,  FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { environment } from '../../../shared-component/service/environments/environment';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { ActivatedRoute } from '@angular/router';
import { EmployeeService } from '../../../service/employee.service';
import { formatDate } from '@angular/common';
import { DataService } from '../../../service/data.service';
import { MetadataService } from '../../../service/metadata.service';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  position: string;
  level: string;
  department: string;
  salary: number;
  hireDate: string;
  email: string;
  phone: string;
  location: string;
  profileImage: string;
  leaveDetails: {
    assignedLeaves: number;
    usedLeaves: number;
    leavesRemaining: number;
    leavesSpent: {
      type: string;
      daysUsed: number;
      from: string;
      to: string;
    }[];
  };
  attendance: {
    year: number;
    daysPresent: number;
    daysAbsent: number;
    lateArrivals: number;
    overtimeHours: number;
    lastPresent: string;
  };
}

@Component({
  selector: 'app-add-employee-form',
  templateUrl: './add-employee-form.component.html',
  styleUrl: './add-employee-form.component.scss',
  providers: [MessageService]
})
export class AddEmployeeFormComponent {
  @Input() close: () => void = () => {};
  @Input() admin: boolean = true

  basicForm!: FormGroup;      
  employeeForm!: FormGroup;
  guarantorForm!: FormGroup
  NOKForm!: FormGroup
  registerInfo!: FormGroup
  showModal: boolean = false;
  currentFile: string = '';
  hide = true;
  hideConfirm = true;
  loading = false
  fileDataUrl: SafeUrl = '';
  imageURL: string =''
  salaryStructure: any = [];
  departments = [
    "Human Resources",
    "Finance",
    "Marketing",
    "Sales",
    "Operations",
    "IT",
    "Customer Service",
    "Legal",
    "Procurement",
    "Administration",
    "Product Development",
    "Research & Development",
    "Quality Assurance",
    "Public Relations",
    "Engineering",
    "Logistics",
    "Health and Safety",
    "Security",
    "Compliance",
    "Training & Development"
  ];
  gender: any[] = []
  currentTab = 1;
  tabs = ["Basic Information", "Employment Information", "Next Of Kin", "Guarantor Information", "Summary"]
   maritalStatuses: any[] = [

  ];
  religions: any[] = [
  ];

  nigerianBanks = [
    "Access Bank",
    "Citibank Nigeria",
    "Ecobank Nigeria",
    "Fidelity Bank",
    "First Bank of Nigeria",
    "First City Monument Bank",
    "Guaranty Trust Bank",
    "Heritage Bank",
    "Jaiz Bank",
    "Keystone Bank",
    "Polaris Bank",
    "Stanbic IBTC Bank",
    "Standard Chartered Bank",
    "Sterling Bank",
    "Union Bank of Nigeria",
    "United Bank for Africa",
    "Wema Bank",
    "Zenith Bank"
  ];
  nextOfKinRelationships: any[] = [
  ];
  nextOfKinList: any[] = []
  guarantorList: any[] = []
  formErrors: string[] = [];
  userInfoRegData: any[] = [];
  userRegData: any = { };
  employeeId:number = 0
  employeeData: any;
  maxDate: string ="";
  constructor(
    private fb: FormBuilder,  
    private metadataService: MetadataService,
    private messageService: MessageService,
    private dataService: DataService, 
    private employeeService: EmployeeService, 
    private route: ActivatedRoute,
    private errorMessageService: ErrorMessageService
  ) {  }

  ngOnInit(): void {
    this.employeeId = parseFloat(this.route.snapshot.paramMap.get('id') as string);
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());  // 18 years ago
    this.maxDate = maxDate.toISOString().split('T')[0];  
   
    const salaryStructure = localStorage.getItem("salaryStructure");
    if (salaryStructure) {
      this.salaryStructure = JSON.parse(salaryStructure);
    }

    this.basicForm = this.fb.group({
      firstName: ['',Validators.required ],
      lastName: ['',Validators.required ],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      DOB: ['', [Validators.required]],
      maritalStatus: [null, [Validators.required, Validators.min(1)]],
      religion: [null, [Validators.required,  Validators.min(1)]],
      address: [null, [Validators.required,  Validators.min(1)]],
      profilePhoto: [null,[ Validators.required, this.imageFileValidator()]]
    });

    this.employeeForm = this.fb.group({
     
      bankName: ["", [Validators.required]],
      accountNumber: ["", [Validators.required]],
      bvn: ["",],
      nin: ["", [Validators.required]],
    });

    this.NOKForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      relationship: [null, [Validators.required]],
      DOB: ['', [Validators.required]],
      emergencyContact: ['', []],

    });

    this.guarantorForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      relationship: ['', [Validators.required]],
      DOB: ['', [Validators.required]],
      idNumber: ['', [Validators.required]],
      yearsKnown: ['', [Validators.required, ]],
      signature: ['', [Validators.required, this.imageFileValidator()]],
      passportPhoto: ['', [Validators.required, this.imageFileValidator()]],
      idCard: ['', [ this.imageFileValidator()]],
    });

    this.registerInfo = this.fb.group( {
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    })

    this.fetchEmployeeData(this.employeeId);

    this.fetchMetaData()

  }

  fetchMetaData(){
    this.metadataService.ensureMetaLoaded();
    this.metadataService.gender$.subscribe(data => (this.gender = data));
    this.metadataService.maritalStatuses$.subscribe(data => (this.maritalStatuses = data));
    this.metadataService.religions$.subscribe(data => (this.religions = data));
    this.metadataService.nextOfKinRelationships$.subscribe(data => (this.nextOfKinRelationships = data));
  }
  fetchEmployeeData(employeeId: number): void {
    this.employeeService.getEmployeeById(employeeId).subscribe({
      next: (employee: any) => {
        this.employeeData = employee
        this.basicForm.patchValue({
              firstName: employee.firstName,
              lastName: employee.lastName,
              email: employee.email,
              // workEmail: "q.oluwadare@centrifugegroup.com",
            });
      }
    })

    console.log(this.employeeData)
  }
 imageFileValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const file = control.value;


    if (!file) {
      return null; 
    }
    if(file instanceof File){
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      console.log(file)
      if (!allowedTypes.includes(file.type )) {
        return { invalidFileType: true };
      }else{
       return null
      }
    }
    else if(typeof(file) == "string"){
      const allowedTypes = ['.png', '.jpeg', '.jpg'];
      const fileExtension = file.slice(file.lastIndexOf('.')).toLowerCase();
      console.log(file)
    console.log(fileExtension)
      if (!allowedTypes.includes(fileExtension )) {
        return { invalidFileType: true };
      }else{
       return null
      }
    } 
    else {return {invalidFileType: true}}
  };
  }
  nextTab() {
  
  if(this.currentTab == 1){
    this.basicForm.markAllAsTouched()
    if(this.basicForm.invalid) return
console.log(this.basicForm.get('profilePhoto')?.value instanceof File)


  }
  if(this.currentTab == 2){
    this.employeeForm.markAllAsTouched()
    if(this.employeeForm.invalid) return
  }

    if (this.currentTab < 5) {
      this.currentTab++;
    }
  }
  nextTabFromNok(){
    this.NOKForm.markAllAsTouched()
    if(this.NOKForm.valid) {
    this.addNextOfKin()
    }
    this.nextOfKinList.map((nok) => {
      const nokData = {
        fullName: nok.fullName,
        email: nok.email,
        phone: nok.phone,
        address: nok.address,
        relationshipId: nok.relationship,
        dob: this.toLocalDateTime(nok.DOB),
        emergencyContact: nok.emergencyContact,
        employeeId:  Number(this.employeeId)
      } 

      const formData = new FormData();
      formData.append('nextOfKinDTO', JSON.stringify(nokData));

      this.employeeService.addNOK(formData).subscribe({
        error: (err) => {
          const detail = this.errorMessageService.getUserMessage(
            err,
            'Failed to save next of kin details. Please try again.'
          );
          this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
        }
      })
    })
    this.nextTab()
  }
  nextTabFromGuarantor(){
    console.log(this.guarantorForm.value)

    
    this.guarantorForm.markAllAsTouched()
    if(this.guarantorForm.valid) {
    this.addGuarantor()
    }
    this.guarantorList.map((guarantor) => {
      const guarantorData = {
        fullName: guarantor.fullName,
        email: guarantor.email,
        phone: guarantor.phone,
        address: guarantor.address,
        relationshipId: guarantor.relationship,
        dob: this.toLocalDateTime(guarantor.DOB),
        employeeId:  Number(this.employeeId),
        yearsKnown: Number(guarantor.yearsKnown),
        idNumber: Number(guarantor.idNumber)
      } 

      const formData = new FormData();
      formData.append('guarantor', JSON.stringify(guarantorData));
      if (guarantor.passportPhoto instanceof File) {
        formData.append('Passport Photograph', guarantor.passportPhoto)
      }
      if (guarantor.idCard instanceof File) {
        formData.append('Id Photo', guarantor.idCard)
      }
      if (guarantor.signature instanceof File) {
        formData.append('Signature', guarantor.signature)
      }
      this.employeeService.addGuarantor(formData).subscribe({
        error: (err) => {
          const detail = this.errorMessageService.getUserMessage(
            err,
            'Failed to save guarantor details. Please try again.'
          );
          this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
        }
      })
    })
    this.nextTab()
  }

  previousTab() {
    if (this.currentTab > 1) {
      this.currentTab--;
    }
  }

  onSubmit() {
  this.loading = true;
  this.addNewEmployee()
  }

  toLocalDateTime(date: Date | string): string {
    if (!date) return '';
    const parsedDate = new Date(date);
    return formatDate(parsedDate, "yyyy-MM-dd'T'HH:mm:ss", 'en-US');
  }

addNewEmployee(){
  const newEmployee = {
 

   id: this.employeeId,
    firstName:  this.employeeData.firstName,
    lastName:  this.employeeData.lastName,
    email:  this.employeeData.email,
    workEmail: this.employeeData.workEmail,
    jobTitle: this.employeeData.jobTitle,
    departmentId: this.employeeData.departmentId,
    levelId: this.employeeData.levelId,
    employmentType:  this.employeeData.employmentType,
    supervisor: this.employeeData.supervisor,

    // Employment Information
    employeeStatus: this.employeeData.employeeStatus,
    employementStartDate: this.employeeData.employementStartDate,
    employmentEndDate: this.employeeData.employmentEndDate,
    onProbation: this.employeeData.onProbation,
    probationStartDate: this.employeeData.probationStartDate,
    probationEndDate: this.employeeData.probationEndDate,
    appraisalDueDate: this.employeeData.appraisalDueDate,


    phone: this.basicForm.get('phone')?.value,
    address: this.basicForm.get('address')?.value,
    dob: this.toLocalDateTime(this.basicForm.get('DOB')?.value),
    genderId: this.basicForm.get('gender')?.value,
    maritalStatusId: this.basicForm.get('maritalStatus')?.value,
    religionId: this.basicForm.get('religion')?.value,
    bankName: this.employeeForm.get('bankName')?.value,
    accountNumber: this.employeeForm.get('accountNumber')?.value,
    nin: this.employeeForm.get('nin')?.value,
    bvn: this.employeeForm.get('bvn')?.value,
  


  
  }
  const formData = new FormData();
  formData.append('employee', JSON.stringify(newEmployee));

  if (this.basicForm.get('profilePhoto')?.value instanceof File) {
    formData.append('file', this.basicForm.get('profilePhoto')?.value)
  }
  console.log(formData)
  this.employeeService.addEmployee(formData).subscribe({
    next: (data: any) => {
      console.log(data)
      this.loading = false;
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Onboarding details submitted successfully!', key: 'tl', life: 3000  }); 
      this.basicForm.reset()
      this.guarantorForm.reset()
      this.employeeForm.reset()
      // this.currentTab = 1

      // if (shouldRedirect) {
      //   this.router.navigate([`/user/onboarding/${data.id}/wer23456fghi367ghj`]);
      // }
    },
    error: (err) => {
      this.loading = false;
      const detail = this.errorMessageService.getUserMessage(
        err,
        'Failed to submit onboarding details. Please try again.'
      );
      this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
    }
  })





}


 
  addNextOfKin() {
    if (this.NOKForm.valid) {
      this.nextOfKinList.push(this.NOKForm.value);
      this.NOKForm.reset(); 
    } else {
    }
  }

  editNextOfKin(index: number) {
    const kin = this.nextOfKinList[index];
    this.NOKForm.patchValue(kin); 
    this.nextOfKinList.splice(index, 1);
  }

  deleteNextOfKin(index: number) {
    // if (confirm('Are you sure you want to remove this next of kin?')) {
    // }
    this.nextOfKinList.splice(index, 1); 

  }
  addGuarantor() {
    if (this.guarantorForm.valid) {
      const guarantor = { ...this.guarantorForm.value };
  
      // Convert files to base64 if they are present
      this.convertFileToBase64(guarantor.signature).then(base64 => guarantor.signature = base64);
      this.convertFileToBase64(guarantor.passportPhoto).then(base64 => guarantor.passportPhoto = base64);
      this.convertFileToBase64(guarantor.idCard).then(base64 => guarantor.idCard = base64);
  
      // Push to the guarantorList
      this.guarantorList.push(guarantor);
  
      // Reset the form
      this.guarantorForm.reset();
    }
  }
  convertFileToBase64(file: File | null): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve(null);
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      }
    });
  }
  
  editGuarantor(index: number) {
    const guarantor = this.guarantorList[index];
    this.guarantorForm.patchValue({
      fullName: guarantor.fullName,
      email: guarantor.email,
      phone: guarantor.phone,
      address: guarantor.address,
      relationship: guarantor.relationship,
      DOB: guarantor.DOB,
      idNumber: guarantor.idNumber,
      yearsKnown: guarantor.yearsKnown,
      signature: null, 
      passportPhoto: null, 
      idCard: null, 
    });
    this.guarantorList.splice(index, 1);
  }

  deleteGuarantor(index: number) {
    if (confirm('Are you sure you want to remove this guarantor?')) {
      this.guarantorList.splice(index, 1); 
    }
  }

  onFileChange(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
     console.log(`${controlName} file:`, file);
      // this.guarantorForm.patchValue({ [controlName]: file }); 
      this.guarantorForm.get(controlName)?.setValue(file)

      this.guarantorForm.get(controlName)?.updateValueAndValidity();

    }
  }
  onProfilePhotoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.previewImageFile(input.files[0])
      const file = input.files[0];
      this.basicForm.get('profilePhoto')?.setValue(file)
      this.basicForm.get('profilePhoto')?.updateValueAndValidity();
    }

  }
  getFormControls(control: string) {
    const formGroup = this[control as keyof this] as FormGroup;
    return Object.keys(formGroup.controls).map(key => ({
      key: key,
      value: formGroup.get(key)?.value
    }));
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

  openFileInModal(fileUrl: string) {
    this.currentFile = fileUrl;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.fileDataUrl = '';
  }

  previewFile(fileUrl: string) {
    if (fileUrl) {
      this.fileDataUrl = fileUrl;
      this.showModal = true;
    }
  
  }

  previewImageFile(file: File){
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        
          this.imageURL = event.target.result;
         
      };
      reader.readAsDataURL(file);
  }
  }

 

  getErrorMessage(control: AbstractControl | null, controlName: string): string {
    // const control = this.basicForm.get(controlName);
    if (control?.hasError('required')) {
      return `${this.toTitleCaseWithSpace(controlName)} is required.`;
    }
  
    if (control?.hasError('email')) {
      return 'Enter a valid email address.';
    }
  
    if (control?.hasError('minlength')) {
      const requiredLength = control.getError('minlength').requiredLength;
      return `${this.toTitleCaseWithSpace(controlName)} must be at least ${requiredLength} characters long.`;
    }
  
    if (control?.hasError('maxlength')) {
      const maxLength = control.getError('maxlength').requiredLength;
      return `${this.toTitleCaseWithSpace(controlName)} cannot be more than ${maxLength} characters long.`;
    }
  
    if (control?.hasError('invalidFileType')) {
      return `${this.toTitleCaseWithSpace(controlName)} must be a valid image file (PNG, JPG, JPEG).`;
    }
  
    return '';
  }
  
}
