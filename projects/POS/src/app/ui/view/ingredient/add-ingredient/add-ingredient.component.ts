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

  productForm!: FormGroup;
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

measurementUnits: MeasurementUnit[] = Object.values(MeasurementUnit);



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




  ngOnInit(): void {

    this.productForm = this.fb.group({
      sku: ['']
    });
   
 console.log("im here")
    this.loadSuppliers();


    // Initialize the form groups
   this.ingredientForm = new FormGroup({
    ingredientName: new FormControl(''),
    sku: new FormControl(''),
    code: new FormControl(''),
    category: new FormControl(''),
    description: new FormControl(''),
    purchasePrice: new FormControl(''),
    sellingPrice: new FormControl(''),
    currentStock: new FormControl(''),
    restockQuantity: new FormControl(''),
    reorderThreshold: new FormControl(''),
    measurementUnit: new FormControl(''),
    reciepe: new FormControl(''),
    supplier: new FormControl(''),
    supplierContact: new FormControl(''),
    expirationDate: new FormControl(''),
    branch: new FormControl(''),
    storageRequirement: new FormControl(''),

   });
   this.supplierForm = new FormGroup({
    supplierName: new FormControl(''),
    contactPerson: new FormControl(''),
    phoneNumber: new FormControl(''),
    email: new FormControl(''),
    address: new FormControl(''),
   });



  }

  ingredient: any = {}



  constructor(private router: Router, private fb: FormBuilder, private messageService: MessageService, private posService: PosServiceService,private http: HttpClient) {
   
  }

  // Load suppliers from api
  loadSuppliers() {
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
    


      const ingredientData = this.ingredientForm.value;
  

      this.posService.addIngredient(ingredientData).subscribe((response: any) => {
        console.log('API Response:', response);
      });

  //   this.saveToLocalStorage(this.ingredientForm.value);
  //   this.ingredientForm.reset();

  //     // Update the local in-memory list after saving
  // const updatedIngredients = JSON.parse(localStorage.getItem('ingredients') || '[]');
  // console.log('Updated Ingredients:', updatedIngredients);

  this.messageService.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Ingredients added successfully',
    life: 3000,
    key: 'tg'
  });


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
  
    const skuInput = document.getElementById('sku') as HTMLInputElement;
  
    if (skuInput) {
      skuInput.value = generatedSku;
      console.log('SKU set to input field:', skuInput.value); // Debugging: Verify input value
    } else {
      console.log('SKU input field not found!'); // Debugging: Check if input field exists
    }
  }

  generateRandomCode() {
    let randomCode = '';
  
    // Loop to generate a 4-digit random number
    for (let i = 0; i < 4; i++) {
      randomCode += Math.floor(Math.random() * 10); // Random digit from 0 to 9
    }
  
    const inputElement = document.getElementById('code') as HTMLInputElement;
    if (inputElement) {
      inputElement.value = randomCode;
      console.log('Generated code set to input field:', randomCode); // Debugging
    }
  }


  
  





  saveToLocalStorage(ingredient: any) {
    // Check if there's a duplicate before adding
    let ingredients = JSON.parse(localStorage.getItem('ingredients') || '[]');
  
    // Prevent duplication by checking unique fields like 'sku' or 'code'
    const exists = ingredients.some((item: any) => item.sku === ingredient.sku || item.code === ingredient.code);
  
    if (!exists) {
      ingredients.push(ingredient);
      localStorage.setItem('ingredients', JSON.stringify(ingredients));
    } else {
      alert('Ingredient already exists!');
    }
  }
  

  formatNumber(event: any, controlName: string) {
    const input = event.target;
  
    // Remove commas
    const rawValue = input.value.replace(/,/g, '');
  
    if (!isNaN(rawValue)) {
      const formattedValue = this.numberWithCommas(rawValue);
      input.value = formattedValue;
  
      console.log(`Updating ${controlName} with value:`, rawValue);
  
      this.ingredientForm.get(controlName)?.setValue(rawValue, { emitEvent: false });
    }
  }
  
  numberWithCommas(x: string): string {
    const parts = x.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  
}

