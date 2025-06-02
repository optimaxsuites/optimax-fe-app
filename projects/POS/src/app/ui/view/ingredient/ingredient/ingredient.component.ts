import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CloseRegisterComponent } from '../../close-register/close-register.component';
import { PosServiceService } from '../../../service/pos-service.service';
import { HttpClient } from '@angular/common/http';
import { MeasurementUnit, supplierData } from '../../../models/interface';

@Component({
  selector: 'app-ingredient',
  templateUrl: './ingredient.component.html',
  styleUrl: './ingredient.component.scss'
})
export class IngredientComponent {
  tableSections: boolean = false;
  items = [{ showMenu: false }, { showMenu: false }]; // Example list of items
  viewInventory: boolean = false;
  filteredIngredients: any[] = [];
  ingredients: any[] = [];
  selectedCategories: number[] = [];
  searchTerm: string = '';
  selectedSku: string = '';
  categories: any[] = [];
  tableSection: boolean = true;
  isMenuOpen: boolean = false;
  selectedIngredients: any[] = [];
//@ts-ignore
  selectedMeasurementUnit: string;

  measurementUnits = Object.values(MeasurementUnit); 

  Delete = false;
  activeIngredient: any;

  // filteredIngredients: any[] = [];

  // ingredients: any[] = [];
  // selectedCategories: number[] = [];
  //   searchTerm: string = '';
  // categories: any[] = [];
  // tableSection: boolean = true;
  // isMenuOpen!: boolean;

  constructor(private router: Router, private posService: PosServiceService,private http: HttpClient) {}

// filteredIngredients = this.ingredients;

ngOnInit(): void {
  this.loadIngredients();

  this.filteredIngredients = this.ingredients;


 
  //     // Extract categories
  //     this.categories = this.filteredIngredients.map(ingredient => ingredient.category);
  //   }, error => {
  //     console.error('Error fetching ingredients:', error);
  //   });
    // const storedData = localStorage.getItem('ingredients');
    // if (storedData) {
    //   this.ingredients = JSON.parse(storedData);
    //   this.filteredIngredients = this.ingredients // Show only the last added ingredient
    // }

    // this.categories = this.filteredIngredients.map(ingredients => ingredients.category);
    
    
    // if (storedData) {
    //   this.ingredients = JSON.parse(storedData);
      // this.filteredIngredients = this.ingredients; // Show all initially
  
  



}
toggleDropdown2(item: any, event?: Event) {
  if (event) {
    event.stopPropagation(); // Stop event propagation
  }
  (item as any).showMenu = !(item as any).showMenu;
}

closeModal(){
  this.Delete = false;
}

  navigateToAddIngredient() {
    this.router.navigate(['add-ingredient']); // Adjust the route as needed
  }
  navigateToViewIngredient(ingredient: any) {
    this.router.navigate(['/view-ingredient'], {
      state: { activeItem: ingredient }
    });
  }
  navigateToEditIngredient(ingredient: any) {
    this.router.navigate(['/edit-ingredient'], {
      state: { activeItem: ingredient }
    });
  }
  closeViewInventory() {
    this.viewInventory = false;
    this.activeIngredient = null;
  }

  loadIngredients() {
    this.posService.getIngredient().subscribe({
      next: (data) => {
        console.log('Ingredients received:', data); // 🔍 DEBUG HERE
        this.ingredients = data;
        this.filteredIngredients = data; // Initialize filtered version
      },
      error: (error) => {
        console.error('Error loading ingredients:', error);
      }
    });
  }
   

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }
  

  filterIngredientsBySearch(): void {
    this.filteredIngredients = this.ingredients.filter(ingredient =>
      ingredient.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
  
  
  filterIngredientsByCategories(selectedCategories: string): void {
    if (!selectedCategories) {
      // If no category is selected, show all ingredients
      this.filteredIngredients = this.ingredients;
    } else {
      // Show filtered ingredients by category
      this.filteredIngredients = this.ingredients.filter(ingredient => ingredient.measurementUnits === selectedCategories);
    }

  }
  deleteIngredient(item: any): void {
    console.log('Deleting item:', item);
  
    // Remove from ingredients list
    this.ingredients = this.ingredients.filter(ing => ing !== item);
    this.filteredIngredients = this.filteredIngredients.filter(ing => ing !== item);
  
    // Optionally update localStorage if needed
    localStorage.setItem('ingredients', JSON.stringify(this.ingredients));
  }
  filterIngredientsByMeasurementUnit(unit: string): void {
    if (!unit) {
      this.filteredIngredients = this.ingredients;
    } else {
      this.filteredIngredients = this.ingredients.filter(
        ingredient =>
          ingredient.measurementUnit?.toLowerCase().trim() === unit.toLowerCase().trim()
      );
    }
  }
  
  
  

  addNewIngredient(): void {
    alert('Add New Ingredient functionality goes here');
  }



  confirmDelete(){
    
  }


}
