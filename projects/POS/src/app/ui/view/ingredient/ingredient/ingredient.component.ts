import { Component } from '@angular/core';
import { Router } from '@angular/router';
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

  //properties for modal 
  showDeleteModal: boolean = false;
  ingredientToDelete: any = null;

  constructor(private router: Router, private posService: PosServiceService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadIngredients();
    this.filteredIngredients = this.ingredients;
  }

  toggleDropdown2(item: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    (item as any).showMenu = !(item as any).showMenu;
  }

  closeModal() {
    this.Delete = false;
    this.showDeleteModal = false;
  }

  navigateToAddIngredient() {
    this.router.navigate(['add-ingredient/:uuid']);
  }

  navigateToViewIngredient(ingredient: any) {
    this.router.navigate(['/view-ingredient/:uuid'], {
      state: { activeItem: ingredient }
    });
  }

  navigateToEditIngredient(ingredient: any) {
    this.router.navigate(['/edit-ingredient/:uuid'], {
      state: { activeItem: ingredient }
    });
  }
  
  navigateToUpdateStock(ingredient: any) {
    this.router.navigate(['/Update-stock/:uuid'], {
      state: { activeItem: ingredient }
    });
  }

  navigateToUpdateIngredient() {
    this.router.navigate(['/Update-stock/:uuid'],);
  }

  closeViewInventory() {
    this.viewInventory = false;
    this.activeIngredient = null;
  }

  loadIngredients() {
    this.posService.getIngredient().subscribe({
      next: (data) => {
        console.log('Ingredients received:', data);
        this.ingredients = data;
        this.filteredIngredients = data;
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
      this.filteredIngredients = this.ingredients;
    } else {
      this.filteredIngredients = this.ingredients.filter(ingredient => ingredient.measurementUnits === selectedCategories);
    }
  }

  openDeleteModal(item: any): void {
    this.ingredientToDelete = item;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.ingredientToDelete) {
      this.posService.deleteIngredient(this.ingredientToDelete.id).subscribe({
        next: () => {
          console.log('Ingredient deleted from backend:', this.ingredientToDelete);
          this.ingredients = this.ingredients.filter(ing => ing.id !== this.ingredientToDelete.id);
          this.filteredIngredients = this.filteredIngredients.filter(ing => ing.id !== this.ingredientToDelete.id);
          this.closeModal();
        },
        error: (error) => {
          console.error('Error deleting ingredient:', error);
          this.closeModal();
        }
      });
    }
  }
  
  deleteIngredient(item: any): void {
    this.openDeleteModal(item);
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
}