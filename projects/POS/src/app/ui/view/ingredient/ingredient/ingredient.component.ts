import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CloseRegisterComponent } from '../../close-register/close-register.component';


@Component({
  selector: 'app-ingredient',
  templateUrl: './ingredient.component.html',
  styleUrl: './ingredient.component.scss'
})
export class IngredientComponent {

  filteredIngredients: any[] = [];
  ingredients: any[] = [];
  selectedCategories: number[] = [];
  searchTerm: string = '';
  selectedSku: string = '';
  categories: any[] = [];
  tableSection: boolean = true;
  isMenuOpen: boolean = false;
  selectedIngredients: any[] = [];



  // filteredIngredients: any[] = [];

  // ingredients: any[] = [];
  // selectedCategories: number[] = [];
  //   searchTerm: string = '';
  // categories: any[] = [];
  // tableSection: boolean = true;
  // isMenuOpen!: boolean;

  constructor(private router: Router) {}

// filteredIngredients = this.ingredients;

ngOnInit(): void {

    const storedData = localStorage.getItem('ingredients');
    if (storedData) {
      this.ingredients = JSON.parse(storedData);
      this.filteredIngredients = this.ingredients // Show only the last added ingredient
    }

    this.categories = this.filteredIngredients.map(ingredients => ingredients.category);
    
    
    // if (storedData) {
    //   this.ingredients = JSON.parse(storedData);
      // this.filteredIngredients = this.ingredients; // Show all initially
  
  



}


  navigateToAddIngredient() {
    this.router.navigate(['add-ingredient']); // Adjust the route as needed
  }
 


  

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }
  


  filterIngredientsBySearch(searchValue: string): void {
    this.filteredIngredients = this.ingredients.filter(ingredient => ingredient.ingredientName.toLowerCase()
    .includes(this.searchTerm.toLowerCase()));
  }
  
  filterIngredientsByCategories(selectedCategories: string): void {
    if (!selectedCategories) {
      // If no category is selected, show all ingredients
      this.filteredIngredients = this.ingredients;
    } else {
      // Show filtered ingredients by category
      this.filteredIngredients = this.ingredients.filter(ingredient => ingredient.category === selectedCategories);
    }

  }
  
  deleteSelectedIngredients(): void {
    console.log('Selected Ingredients:', this.selectedIngredients);
    // Remove selected ingredients from the main and filtered lists
    this.ingredients = this.ingredients.filter(item => !this.selectedIngredients.includes(item));
    this.filteredIngredients = this.filteredIngredients.filter(item => !this.selectedIngredients.includes(item));
  
    // Update localStorage
    localStorage.setItem('ingredients', JSON.stringify(this.ingredients));
  
    // Clear selected ingredients
    this.selectedIngredients = [];
  }
  
  

  addNewIngredient(): void {
    alert('Add New Ingredient functionality goes here');
  }






}
