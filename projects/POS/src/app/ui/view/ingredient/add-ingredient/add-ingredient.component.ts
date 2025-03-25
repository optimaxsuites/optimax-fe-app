import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { ReactiveFormsModule } from '@angular/forms';  // Import this
import { FormsModule } from '@angular/forms';


type MeasurementUnit = 'kg' | 'g' | 'liters' | 'ml' | 'pieces';

@Component({
  selector: 'app-add-ingredient',
  templateUrl: './add-ingredient.component.html',
  styleUrl: './add-ingredient.component.scss'
})
export class AddIngredientComponent {


  

  //@ts-ignore
  ingredientForm!: FormGroup;
  selectedCategory: any;



  ngOnInit(): void {
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



  constructor(private router: Router, private fb: FormBuilder) {
   
  }

  navigateToPrevious() {
    this.router.navigate(['admin/pos/ingredients/:uuid']); // Replace with your actual route
  }

  onSubmit() {
    console.log("Button clicked!");

    this.saveToLocalStorage(this.ingredientForm.value);
    this.ingredientForm.reset();

      // Update the local in-memory list after saving
  const updatedIngredients = JSON.parse(localStorage.getItem('ingredients') || '[]');
  console.log('Updated Ingredients:', updatedIngredients);

    alert('Ingredient added and saved to local storage!');
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

