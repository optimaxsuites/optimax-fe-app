import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  ingredientForm: FormGroup ;
  selectedCategory: any;

  ingredientName: string = '';
  sku: string = '';
  category: string = '';
  description: string = '';
  purchasePrice: number = 0;
  sellingPrice: number = 0;
  currentStock: number = 0;
  restockQuantity: number = 0;
  reorderThreshold: number = 0;
  measurementUnit: string = '';
  supplierName: string = '';
  supplierContact: string = '';
  expirationDate: string = '';
  branch: string = '';
  storageRequirements: string = '';


  ngOnInit(): void {
  


  }

  ingredient: any = {}





  constructor(private router: Router, private fb: FormBuilder) {
  }

  navigateToPrevious() {
    this.router.navigate(['admin/pos/ingredients/:uuid']); // Replace with your actual route
  }

  onSubmit() {
    console.log("Button clicked!");
    const newIngredient = this.ingredientForm.value;
    console.log("Form Data:", newIngredient);

    this.saveToLocalStorage(newIngredient);
    this.ingredientForm.reset();
    alert('Ingredient added and saved to local storage!');
  }

  saveToLocalStorage(ingredient: any) {
    let ingredients = JSON.parse(localStorage.getItem('ingredients') || '[]');
    ingredients.push(ingredient);
    localStorage.setItem('ingredients', JSON.stringify(ingredients));
  }
  
}
