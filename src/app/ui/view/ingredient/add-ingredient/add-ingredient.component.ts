import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { ReactiveFormsModule } from '@angular/forms';  // Import this
import { FormsModule } from '@angular/forms';
import { MeasurementUnit, supplierData } from '../../../models/interface';
import { Message, MessageService } from 'primeng/api';
import { PosServiceService } from '../../../service/pos-service.service';
import { HttpClient } from '@angular/common/http';


// type MeasurementUnit = 'kg' | 'g' | 'liters' | 'ml' | 'pieces';

@Component({
  selector: 'app-add-ingredient',
  templateUrl: './add-ingredient.component.html',
  styleUrl: './add-ingredient.component.scss'
})

export class AddIngredientComponent {
  productImage: string | null = null;
  previewImage: string | ArrayBuffer | null = null;
  selectedImageFile: File | null = null;
  productForm!: FormGroup;
  isEditMode: boolean = false;
  base64Image: string | null = null; // store base64 for localStorage
  countryCodes = [
    { name: 'Nigeria', code: '+234' },
    { name: 'United States', code: '+1' },
    { name: 'United Kingdom', code: '+44' },
    { name: 'Canada', code: '+1' },
    { name: 'India', code: '+91' },
    { name: 'Germany', code: '+49' },
    { name: 'France', code: '+33' },
    { name: 'Australia', code: '+61' },
  ];

measurementUnits = Object.keys(MeasurementUnit)



  // Form fields
  supplierName: string = '';
  contactPerson: string = '';
  email: string = '';
  phone: string = '';
  address: string = '';
  // products: string = '';
  notes: string = '';
  agreeTerms: boolean = false;
  selectedCountryCode = '+234'; // Default to Nigeria
  phonePattern = '^\\+?[1-9]\\d{1,14}$'; // Allows international phone numbers
  phoneNumber: string = '';
  purchasePrice: string = '';



  isOpen = false;

  
  hasSelectedSupplier = false;
  //@ts-ignore
  ingredientForm!: FormGroup;
  supplierForm!: FormGroup;
  selectedCategory: any;

  
  suppliers: supplierData[] = [];
  selectedSupplier: number | null = null;  // Store the selected supplier's ID

  branches: any[] = [];



  ngOnInit(): void {

    this.productForm = this.fb.group({
      sku: ['']
    });
   
    this.loadBranches();

 console.log("im here")
    this.loadSuppliers();


    // Initialize the form groups
   this.ingredientForm = new FormGroup({
    name: new FormControl(''),
    sku: new FormControl(''),
    code: new FormControl(''),
    purchasePrice: new FormControl(''),
    currentStock: new FormControl(''),
    reorderThreshold: new FormControl(''),
    measurementUnit: new FormControl(null),
    supplierId: new FormControl(null),
    branches: new FormControl(''),
   

   });
   this.supplierForm = new FormGroup({
    supplierName: new FormControl(''),
    contactPerson: new FormControl(''),
    phoneNumber: new FormControl(''),
    email: new FormControl(''),
    address: new FormControl(''),
   });

   console.log(this.ingredientForm.value);  // This should show the selected value for measurementUnit


  }

  ingredient: any = {}



  constructor(private router: Router, private fb: FormBuilder, private messageService: MessageService, private posService: PosServiceService,private http: HttpClient) {
   
  }
  

  // Load suppliers from api
  loadSuppliers() {
    console.log("Loading suppliers...");
    this.posService. getSupplier().subscribe(
      (data) => {
        this.suppliers = data;
        console.log('Suppliers loaded:', this.suppliers);
      },
      (error) => {
        console.error('Error loading suppliers:', error);
      }
    );
  }


  navigateToPrevious() {
    this.router.navigate(['admin/pos/ingredients/:uuid']); // Replace with your actual route
  }

  openModal() {
    console.log("clicked")
    this.isOpen = true;   
}

closeModal(){
  this.isOpen = false;
}

clearForm() {
  this.supplierName = '';
  this.contactPerson = '';
  this.email = '';
  this.selectedCountryCode = '+234';
  this.phone = '';
  this.address = '';
  this.notes = '';
}
loadBranches() {
  this.posService.getBranches().subscribe(
    (data) => {
      this.branches = data;
      console.log('Branches loaded:', this.branches);
    },
    (error) => {
      console.error('Error loading branches:', error);
    }
  );
}

submitForm() {

  // Save to local storage
  // this.suppliers.push(newSupplier);
  // localStorage.setItem('suppliers', JSON.stringify(this.suppliers));
  

  const data = this.supplierForm.value;

  this.posService.addSupplier(data).subscribe((response: any) => {
    console.log('API Response:', response);
    console.log('Supplier added:', data);
  });

  // Update dropdown and reset the form
  // this.loadSuppliers();
  this.clearForm();
  this.closeModal();
}





changeSelectedSupplier(event: any) {
  this.selectedSupplier = event.target.value;
}




  onSubmit() {
    console.log("Button clicked!");
    
      // Save image to localStorage



      const ingredientData = this.ingredientForm.value;
  
    console.log('Data being sent:', ingredientData);


    if (this.base64Image) {
      const key = `ingredientImage_${ingredientData.name}`; // unique key per ingredient
      localStorage.setItem(key, this.base64Image);
      console.log(`Saved image for ${ingredientData.name}`);
    }


    this.posService.addIngredient(ingredientData).subscribe({
      next: (response: any) => {
        console.log('API Response:', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Ingredients added successfully',
          life: 3000,
          key: 'tg'
        });
      },
      error: (error) => {
        console.error('API Error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to add ingredient. Please try again.',
          life: 3000,
          key: 'tg'
        });
      }
    });
    
    this.ingredientForm.reset();
  this.resetImage();

      

  //   this.saveToLocalStorage(this.ingredientForm.value);
  //   this.ingredientForm.reset();

  //     // Update the local in-memory list after saving
  // const updatedIngredients = JSON.parse(localStorage.getItem('ingredients') || '[]');
  // console.log('Updated Ingredients:', updatedIngredients);





  



  }
  resetImage() {
    this.previewImage = null;

    // Optional: clear file input
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';  // Clear the input value
    }
  }
  generateRandomSku() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    
    for (let i = 0; i < 3; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const timestamp = Date.now().toString().slice(-5);
    const generatedSku = `${randomPart}-${timestamp}`;
    console.log('Generated SKU:', generatedSku); // Debugging: Check generated SKU
    
    // ✅ Update the Angular FormControl properly
    this.ingredientForm.get('sku')?.setValue(generatedSku);  // Use lowercase 'sku' to match formControlName
    console.log('Form after SKU set:', this.ingredientForm.value); // Debugging: Check form values
  }
  

  generateRandomCode() {
    let randomCode = '';
  
    // Loop to generate a 4-digit random number
    for (let i = 0; i < 4; i++) {
      randomCode += Math.floor(Math.random() * 10); // Random digit from 0 to 9
    }
  
    this.ingredientForm.get('code')?.setValue(randomCode);

  }


  
  






  

  
  // numberWithCommas(x: string): string {
  //   const parts = x.split('.');
  //   parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  //   return parts.join('.');
  // }
  onImageUpload(event: any) {
    const file = event.target.files[0];
    const reader = new FileReader();
  
    reader.onload = () => {
      this.previewImage = reader.result as string;
      this.base64Image = this.previewImage;
      this.ingredientForm.patchValue({ image: this.base64Image });
    };
  
    if (file) {
      reader.readAsDataURL(file); // Convert to base64
    }
  }
  
}

