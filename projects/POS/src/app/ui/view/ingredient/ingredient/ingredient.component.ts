import { Component } from '@angular/core';

@Component({
  selector: 'app-ingredient',
  templateUrl: './ingredient.component.html',
  styleUrl: './ingredient.component.scss'
})
export class IngredientComponent {

  filteredIngredients: any[] = [];

  ingredients: any[] = [];
  selectedCategory: string | null = null;
  searchTerm: string = '';
  categories: any[] = [];
  tableSection: boolean = true;


  constructor() {}

// filteredIngredients = this.ingredients;

  ngOnInit(): void {
    this.loadIngredients();
  

    this.filteredIngredients = this.ingredients;
  this.categories = [...new Set(this.ingredients.map(item => item.category))]; // Get unique categories

  }



  loadIngredients(): void {
    this.ingredients = [
      {
        id: 1,
        name: 'Sugar',
        code: 'C123',
        sku: 'ING1234',
        measurementUnit: 'kg',
        supplier: { id: 1, name: 'Sweet Supplies Co.' },
        branches: [
          { id: 1, name: 'Main Branch' },
          { id: 2, name: 'Secondary Branch' }
        ],
        purchasePrice: 100.00,
        currentStock: 500,
        reorderThreshold: 100,
        category: 'Baking Supplies'
      },
      {
        id: 2,
        name: 'Cinnamon',
        code: 'C456',
        sku: 'ING5678',
        measurementUnit: 'g',
        supplier: { id: 2, name: 'Spice World Ltd.' },
        branches: [
          { id: 1, name: 'Main Branch' }
        ],
        purchasePrice: 50,
        currentStock: 300,
        reorderThreshold: 50,
        category: 'Spices'
      },
      {
        id: 3,
        name: 'Butter',
        code: 'C789',
        sku: 'ING9101',
        measurementUnit: 'kg',
        supplier: { id: 3, name: 'Dairy Depot' },
        branches: [
          { id: 2, name: 'Secondary Branch' }
        ],
        purchasePrice: 200.00,
        currentStock: 150,
        reorderThreshold: 30,
        category: 'Dairy'
      }
    ];
    
  }
  filterIngredientsByCategory(): void {
    if (!this.selectedCategory) {
      this.filteredIngredients = this.ingredients;
    } else {
      this.filteredIngredients = this.ingredients.filter(ingredient => 
        ingredient.category === this.selectedCategory
      );
    }
  }
  

  filterIngredientsBySearch(): void {
    this.filteredIngredients = this.ingredients.filter(ingredient =>
      ingredient.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }


  deleteIngredient(ingredient: any): void {
    this.ingredients = this.ingredients.filter(item => item.id !== ingredient.id);
  }

  addNewIngredient(): void {
    alert('Add New Ingredient functionality goes here');
  }


  filterProductsBySearch(event: any): void {
    console.log('Search term:', event);
  }

}
