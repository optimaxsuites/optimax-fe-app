import { Component, Input } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../../../service/employee.service';
import { formatDate } from '@angular/common';
import { MetadataService } from '../../../service/metadata.service';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';
import { v4 as uuidV4 } from "uuid"

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
  hide = true;
  hideConfirm = true;
  loading = false
  draftLoading = false;
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
    private employeeService: EmployeeService, 
    private route: ActivatedRoute,
    private errorMessageService: ErrorMessageService,
    private router: Router
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
        this.employeeData = employee;
        this.applyEmployeeData(employee);
      }
    })

    console.log(this.employeeData)
  }

  private applyEmployeeData(employee: any): void {
    if (!employee) return;

    const genderId = this.resolveId(employee.genderId ?? employee.gender);
    const maritalStatusId = this.resolveId(employee.maritalStatusId ?? employee.maritalStatus);
    const religionId = this.resolveId(employee.religionId ?? employee.religion);

    this.basicForm.patchValue({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      address: employee.address,
      DOB: this.toDateInputValue(employee.dob ?? employee.DOB),
      gender: genderId,
      maritalStatus: maritalStatusId,
      religion: religionId
    });

    this.employeeForm.patchValue({
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      bvn: employee.bvn,
      nin: employee.nin
    });

    const mediaNo = employee?.employeeMedia?.mediaNo;
    const profileImage = employee?.profileImage || employee?.profilePhoto || employee?.imageUrl;
    if (mediaNo) {
      this.loadProfilePhoto(mediaNo);
      this.basicForm.get('profilePhoto')?.setValue(mediaNo);
    } else if (profileImage) {
      this.imageURL = profileImage;
      this.basicForm.get('profilePhoto')?.setValue(profileImage);
    }
    this.basicForm.get('profilePhoto')?.updateValueAndValidity();

    const nextOfKin = employee?.nextOfKin || employee?.nextOfKins;
    if (Array.isArray(nextOfKin)) {
      this.nextOfKinList = nextOfKin.map((nok: any) => ({
        fullName: nok.fullName,
        email: nok.email,
        phone: nok.phone,
        address: nok.address,
        relationship: this.resolveId(nok.relationshipId ?? nok.relationship),
        DOB: this.toDateInputValue(nok.dob ?? nok.DOB),
        emergencyContact: nok.emergencyContact,
        __saved: true
      }));
    }

    const guarantors = employee?.guarantor || employee?.guarantors;
    if (Array.isArray(guarantors)) {
      this.guarantorList = guarantors.map((guarantor: any) => ({
        fullName: guarantor.fullName,
        email: guarantor.email,
        phone: guarantor.phone,
        __saved: true
      }));
    }
  }

  private resolveId(value: any): any {
    if (!value) return value;
    if (typeof value === 'object' && 'id' in value) return value.id;
    return value;
  }

  private toDateInputValue(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    return formatDate(parsed, 'yyyy-MM-dd', 'en-US');
  }

  private loadProfilePhoto(mediaNo: string): void {
    this.employeeService.getEmployeeImage(mediaNo).subscribe({
      next: (response) => {
        const blob = new Blob([response], { type: 'image/png' });
        this.imageURL = URL.createObjectURL(blob);
      },
      error: (err) => {
        console.error('Failed to load profile photo:', err);
      }
    });
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
      return null;
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
    this.saveNextOfKinEntries();
    this.nextTab()
  }

  private saveNextOfKinEntries(onComplete?: (hadError: boolean) => void) {
    const unsaved = this.nextOfKinList.filter((nok) => !nok.__saved);
    if (unsaved.length === 0) {
      onComplete?.(false);
      return;
    }
    let pending = unsaved.length;
    let hadError = false;

    unsaved.forEach((nok) => {
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
        next: () => {
          nok.__saved = true;
          pending -= 1;
          if (pending === 0) onComplete?.(hadError);
        },
        error: (err) => {
          hadError = true;
          const detail = this.errorMessageService.getUserMessage(
            err,
            'Failed to save next of kin details. Please try again.'
          );
          this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
          pending -= 1;
          if (pending === 0) onComplete?.(hadError);
        }
      })
    });
  }
  nextTabFromGuarantor(){
    console.log(this.guarantorForm.value)

    
    this.guarantorForm.markAllAsTouched()
    if(this.guarantorForm.valid) {
    this.addGuarantor()
    }
    this.saveGuarantorEntries();
    this.nextTab()
  }

  private saveGuarantorEntries(onComplete?: (hadError: boolean) => void) {
    const unsaved = this.guarantorList.filter((guarantor) => !guarantor.__saved);
    if (unsaved.length === 0) {
      onComplete?.(false);
      return;
    }
    let pending = unsaved.length;
    let hadError = false;

    unsaved.forEach((guarantor) => {
      const guarantorData = {
        fullName: guarantor.fullName,
        email: guarantor.email,
        phone: guarantor.phone,
        employeeId:  Number(this.employeeId),
      } 

      const formData = new FormData();
      formData.append('guarantor', JSON.stringify(guarantorData));
      this.employeeService.addGuarantor(formData).subscribe({
        next: () => {
          guarantor.__saved = true;
          pending -= 1;
          if (pending === 0) onComplete?.(hadError);
        },
        error: (err) => {
          hadError = true;
          const detail = this.errorMessageService.getUserMessage(
            err,
            'Failed to save guarantor details. Please try again.'
          );
          this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
          pending -= 1;
          if (pending === 0) onComplete?.(hadError);
        }
      })
    });
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

  saveDraft() {
    if (this.draftLoading || this.loading) return;

    const isValid = this.validateCurrentSectionForDraft();
    if (!isValid) return;

    this.draftLoading = true;

    if (this.currentTab === 3) {
      this.saveNextOfKinEntries((hadError) => {
        this.draftLoading = false;
        if (!hadError) {
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Draft saved successfully!', key: 'tl', life: 3000 });
        }
      });
      return;
    }

    if (this.currentTab === 4) {
      this.saveGuarantorEntries((hadError) => {
        this.draftLoading = false;
        if (!hadError) {
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Draft saved successfully!', key: 'tl', life: 3000 });
        }
      });
      return;
    }

    const formData = this.buildEmployeeFormData();
    this.employeeService.addEmployee(formData).subscribe({
      next: () => {
        this.draftLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Draft saved successfully!', key: 'tl', life: 3000 });
      },
      error: (err) => {
        this.draftLoading = false;
        const detail = this.errorMessageService.getUserMessage(
          err,
          'Failed to save draft. Please try again.'
        );
        this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
      }
    })
  }

  private validateCurrentSectionForDraft(): boolean {
    if (this.currentTab === 1) {
      this.basicForm.markAllAsTouched();
      return this.basicForm.valid;
    }
    if (this.currentTab === 2) {
      this.employeeForm.markAllAsTouched();
      return this.employeeForm.valid;
    }
    if (this.currentTab === 3) {
      this.NOKForm.markAllAsTouched();
      if (this.NOKForm.valid) {
        this.addNextOfKin();
      }
      return this.nextOfKinList.length > 0;
    }
    if (this.currentTab === 4) {
      this.guarantorForm.markAllAsTouched();
      if (this.guarantorForm.valid) {
        this.addGuarantor();
      }
      return this.guarantorList.length > 0;
    }
    return true;
  }

  toLocalDateTime(date: Date | string): string {
    if (!date) return '';
    const parsedDate = new Date(date);
    return formatDate(parsedDate, "yyyy-MM-dd'T'HH:mm:ss", 'en-US');
  }

addNewEmployee(){
  const formData = this.buildEmployeeFormData();
      const vettingPayload = this.buildEmployeePayload();

  this.employeeService.addEmployee(formData).subscribe({
    next: (data: any) => {
      const vettingPayload = this.buildEmployeePayload();
      if (data?.id) {
        vettingPayload.employee.id = data.id;
        vettingPayload.employeeId = data.id;
      }
      this.employeeService.sendOnboardingVetting(vettingPayload).subscribe({
        error: (err) => {
          const detail = this.errorMessageService.getUserMessage(
            err,
            'Vetting request could not be sent. Please contact support.'
          );``
          this.messageService.add({ severity: 'warn', summary: 'Notice', detail, key: 'tl', life: 4000 });
        }
      });

      console.log(data)
      this.loading = false;
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Onboarding details submitted successfully!', key: 'tl', life: 3000  }); 
      this.basicForm.reset()
      this.guarantorForm.reset()
      this.employeeForm.reset()
      // this.currentTab = 1
      this.router.navigate([`/admin/hr/me/`+uuidV4()]);

      // if (shouldRedirect) {
        this.router.navigate([`/user/onboarding/${data.id}/wer23456fghi367ghj`]);
      // }
    },
    error: (err) => {
      this.loading = false;
      const detail = this.errorMessageService.getUserMessage(
        err,
        'Failed to submit onboarding details. Please try again.'
      );
      console.log("vettingPayload:", vettingPayload)
      // this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
    }
  })
}

private buildEmployeePayload(): {
  employeeId: number;
  employee: any;
  nextOfKin: any[];
  guarantors: any[];
} {
  const employeeMediaId = this.employeeData?.employeeMedia?.id;
  const storedUserId = sessionStorage.getItem('userid') || localStorage.getItem('userid');
  const newEmployee: any = {
 

   id: this.employeeId,
    userId: this.employeeData?.userId ?? this.employeeData?.user?.userId ?? storedUserId ?? null,
    firstName:  this.employeeData.firstName,
    lastName:  this.employeeData.lastName,
    email:  this.employeeData.email,
    workEmail: this.employeeData.workEmail,
    jobTitle: this.employeeData.jobTitle,
    // departmentId: this.employeeData.departmentId,
    levelId: this.employeeData.level.id,
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
  

    // levelId: this.employeeData.levelId,
    departmentId: this.employeeData.department.id,
    jobTypeId: this.employeeData.jobType.id

  
  };
  if (employeeMediaId) {
    newEmployee.employeeMediaId = employeeMediaId;
  }

  const nextOfKin = this.nextOfKinList.map((nok) => ({
    fullName: nok.fullName,
    email: nok.email,
    phone: nok.phone,
    address: nok.address,
    relationshipId: nok.relationship,
    dob: this.toLocalDateTime(nok.DOB),
    emergencyContact: nok.emergencyContact,
    employeeId: Number(this.employeeId)
  }));

  const guarantors = this.guarantorList.map((guarantor) => ({
    fullName: guarantor.fullName,
    email: guarantor.email,
    phone: guarantor.phone,
    employeeId: Number(this.employeeId)
  }));

  return {
    employeeId: Number(this.employeeId),
    employee: newEmployee,
    nextOfKin,
    guarantors
  };
}

private buildEmployeeFormData(): FormData {
  const payload = this.buildEmployeePayload();
  const employee = payload.employee || {};
  const formData = new FormData();
  formData.append('employee', JSON.stringify(employee));

  const profilePhoto = this.basicForm.get('profilePhoto')?.value;
  if (profilePhoto instanceof File) {
    formData.append('file', profilePhoto, profilePhoto.name);
  }

  return formData;
}


 
  addNextOfKin() {
    if (this.NOKForm.valid) {
      this.nextOfKinList.push({ ...this.NOKForm.value, __saved: false });
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
      const guarantor = { ...this.guarantorForm.value, __saved: false };
      // Push to the guarantorList
      this.guarantorList.push(guarantor);
  
      // Reset the form
      this.guarantorForm.reset();
    }
  }
  
  editGuarantor(index: number) {
    const guarantor = this.guarantorList[index];
    this.guarantorForm.patchValue({
      fullName: guarantor.fullName,
      email: guarantor.email,
      phone: guarantor.phone,
    });
    this.guarantorList.splice(index, 1);
  }

  deleteGuarantor(index: number) {
    if (confirm('Are you sure you want to remove this guarantor?')) {
      this.guarantorList.splice(index, 1); 
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
    return Object.keys(obj).filter(key => key !== '__saved');
  }
  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
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
