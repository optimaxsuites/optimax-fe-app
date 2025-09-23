import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PosServiceService } from '../../../service/pos-service.service';
import { Form, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-edit-ingredients',
  templateUrl: './edit-ingredients.component.html',
  styleUrl: './edit-ingredients.component.scss'
})
export class EditIngredientsComponent {
  navigation: any;
  activeItem: any;
  //@ts-ignore
  ingredientForm:!FormGroup;


  constructor(private router: Router, private posService: PosServiceService) {
    this.navigation = this.router.getCurrentNavigation();
    this.activeItem = this.navigation?.extras?.state?.['activeItem'];
  }
  
  navigateToPrevious() {
    this.router.navigate(['ingredients/:uuid']); 
  }
    ngOnInit(): void {
      this.ingredientForm = new FormGroup({
        name: new FormControl(this.activeItem?.name || ''),
        purchasePrice: new FormControl(this.activeItem?.purchasePrice || ''),
        currentStock: new FormControl(this.activeItem?.currentStock || ''),
        reorderThreshold: new FormControl(this.activeItem?.reorderThreshold || ''),
        measurementUnit: new FormControl(this.activeItem?.measurementUnit || ''),
        supplierId: new FormControl(this.activeItem?.supplierId || ''),
        branches: new FormControl(this.activeItem?.branches || ''),
      });
      console.log('Loaded ingredient:', this.activeItem);
      }
      
      
      updateIngredient() {
        if (this.ingredientForm.valid) {
          // Collect updated data from form
          const updatedData = this.ingredientForm.value;
      
          // Track the original data before updating (you can store it when you first load the data)
          const originalData = { ...this.activeItem }; // Create a shallow copy of the original data
      
          // Assuming addIngredient method sends POST request to update data
          this.posService.addIngredient(updatedData).subscribe(
            (response) => {
              console.log('Ingredient updated:', response);
      
              // Compare original and updated data to see what was changed
              this.logUpdatedFields(originalData, updatedData);
            },
            (error) => {
              console.error('Error updating ingredient:', error);
            }
          );
        } else {
          console.error('Form is invalid');
        }
      }
      
      // Function to log updated fields
      logUpdatedFields(originalData: any, updatedData: any) {
        // Iterate over the keys of the object and compare original and updated values
        for (const key in originalData) {
          if (originalData.hasOwnProperty(key) && originalData[key] !== updatedData[key]) {
            console.log(`Updated ${key}:`, {
              oldValue: originalData[key],
              newValue: updatedData[key],
            });
          }
        }
      }
      
        
}
