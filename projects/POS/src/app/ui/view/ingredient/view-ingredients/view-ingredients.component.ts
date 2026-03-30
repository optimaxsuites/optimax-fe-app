import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PosServiceService } from '../../../service/pos-service.service';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-view-ingredients',
  templateUrl: './view-ingredients.component.html',
  styleUrl: './view-ingredients.component.scss'
})
export class ViewIngredientsComponent implements OnInit {

  ingredientForm!: FormGroup;
  activeItem: any;
  navigation: any;
  allMovements: any[] = [];
  incomingMovements: any[] = [];
  outgoingMovements: any[] = [];
  
  navigateToPrevious() {
    this.router.navigate(['ingredients/:uuid']); 
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
    
    // if (this.activeItem && this.activeItem.id) {
    //   this.loadStockMovements(this.activeItem.id);
    // }
  }

  // loadStockMovements(ingredientId: number) {
  //   this.posService.getStockMovementsByIngredientId(ingredientId).subscribe({
  //     next: (data) => {
  //       this.allMovements = data;
  //       this.filterMovements();
  //       console.log('All movements received:', this.allMovements);
  //     },
  //     error: (error) => {
  //       console.error('Error loading stock movements:', error);
  //     }
  //   });
  // }

  filterMovements() {
    this.incomingMovements = this.allMovements.filter(movement => movement.quantity > 0);
    this.outgoingMovements = this.allMovements.filter(movement => movement.quantity < 0);
  }

  transformQuantity(quantity: number): string {
    if (quantity > 0) {
      return `+${quantity}`;
    } else if (quantity < 0) {
      return `${quantity}`;
    } else {
      return '0';
    }
  }
}