import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PosServiceService } from '../../../service/pos-service.service';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-view-ingredients',
  templateUrl: './view-ingredients.component.html',
  styleUrl: './view-ingredients.component.scss'
})
export class ViewIngredientsComponent {

  ingredientForm!: FormGroup;
  activeItem: any;
  navigation: any;
  
  navigateToPrevious() {
    this.router.navigate(['admin/pos/ingredients/:uuid']); // Replace with your actual route
  }
  constructor(private router: Router, private posService: PosServiceService) {
    this.navigation = this.router.getCurrentNavigation();
    this.activeItem = this.navigation?.extras?.state?.['activeItem'];
  }
  ngOnInit(): void {
     this.ingredientForm = new FormGroup({
      name: new FormControl(''),
      sku: new FormControl(''),
      code: new FormControl(''),
      purchasePrice: new FormControl(''),
      currentStock: new FormControl(''),
      reorderThreshold: new FormControl(''),
      measurementUnit: new FormControl(null),
      supplierName: new FormControl(null),
      branches: new FormControl(''),
     });
     console.log('Loaded ingredient:', this.activeItem);
    }
    
}