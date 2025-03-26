import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { ReactiveFormsModule } from '@angular/forms';  // Import this
import { FormsModule } from '@angular/forms';
import { supplierData } from '../../../models/interface';
import { Message, MessageService } from 'primeng/api';


type MeasurementUnit = 'kg' | 'g' | 'liters' | 'ml' | 'pieces';

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



  isOpen = false;


  
  hasSelectedSupplier = false;
  //@ts-ignore
  ingredientForm!: FormGroup;
  selectedCategory: any;

  
  suppliers: any[] = [];
  selectedSupplier: any = null;




  ngOnInit(): void {

    this.productForm = this.fb.group({
      sku: ['']
    });
    this.loadSuppliers();

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
    supplier: new FormControl(''),
    supplierContact: new FormControl(''),
    expirationDate: new FormControl(''),
    branch: new FormControl(''),
    storageRequirement: new FormControl(''),

   });


  }

  ingredient: any = {}



  constructor(private router: Router, private fb: FormBuilder, private messageService: MessageService) {
   
  }

  // Load suppliers from local storage
  loadSuppliers() {
    const savedSuppliers = localStorage.getItem('suppliers');
    this.suppliers = savedSuppliers ? JSON.parse(savedSuppliers) : [];
  }


  navigateToPrevious() {
    this.router.navigate(['admin/pos/ingredients/:uuid']); // Replace with your actual route
  }

  openModal() {
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
  const newSupplier = {
    id: this.suppliers.length + 1,
    supplierName: this.supplierName,
    contactPerson: this.contactPerson,
    email: this.email,
    countryCode: this.selectedCountryCode,
    phone: this.phone,
    address: this.address,
    notes: this.notes
  };

  // Save to local storage
  this.suppliers.push(newSupplier);
  localStorage.setItem('suppliers', JSON.stringify(this.suppliers));

  // Update dropdown and reset the form
  this.loadSuppliers();
  this.clearForm();
  this.closeModal();
}


changeSelectedSupplier(event: any) {
  this.selectedSupplier = event.target.value;
}




  onSubmit() {
    console.log("Button clicked!");

    this.saveToLocalStorage(this.ingredientForm.value);
    this.ingredientForm.reset();

      // Update the local in-memory list after saving
  const updatedIngredients = JSON.parse(localStorage.getItem('ingredients') || '[]');
  console.log('Updated Ingredients:', updatedIngredients);

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
  

  formatNumber(event: any) {
    let input = event.target.value;
    // Remove non-numeric characters except for commas
    input = input.replace(/[^0-9,]/g, '');
  
    // Remove existing commas and add them back correctly
    input = input.replace(/,/g, '');
    input = input.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
    event.target.value = input;
  }
  
}

