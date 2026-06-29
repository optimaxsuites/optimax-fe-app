import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { MetadataService } from '../../../../../../../../POS/src/app/ui/service/metadata.service';
import { PosServiceService } from '../../../../../../../../POS/src/app/ui/service/pos-service.service';

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss'
})
export class CategoryComponent {
  private readonly _defaultExpiryDate = new Date(
    Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000
  );
	categories: any[] = [];


productCategory = {
      id: 0,
      name: '',
      code: '',
      description: '',
      endDate: this._defaultExpiryDate.toISOString()
    }

    savingCategory: boolean = false
    editingCategory: any = {}

  constructor(
      private posService: PosServiceService, 
      private metadataService: MetadataService, 
      private messageService: MessageService
    ) {}

  ngOnInit() {
    this.metadataService.category$.subscribe((data: any[]) => (this.categories = data));
  }
    
   addCategory() {
    let categoryData = { ...this.productCategory };
    // The inputted date would be something like `2025-06-07` so we need to force it to an iso string
    categoryData.endDate = new Date(categoryData.endDate).toISOString();

    if (this.checkForEmptyFields(categoryData, ['endDate', 'description'])) {
      console.log('all fields are required');
      this.messageService.add({
        severity: 'error',
        summary: 'warn',
        detail: 'All fields are required',
        key: 'tl',
        life: 3000,
      });
    } else {
      this.posService.addCategory(categoryData).subscribe(
        async (data) => {
          console.log(data);
          if (data) {
            this.messageService.add({
              severity: 'success',
              summary: 'Category Added',
              detail: 'Category added successfully.',
              key: 'tl',
              life: 3000,
            });
             categoryData = {
              id: 0,
              name: '',
              code: '',
              description: '',
              endDate: '',
            };
            // this.categories.push(data);
            this.metadataService.addCategoryToState(data) 

            categoryData = {
              id: 0,
              name: '',
              code: '',
              description: '',
              endDate: '',
            };
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: 'Failed, please try again.',
              key: 'tl',
              life: 3000,
            });
          }
        },
        (error: HttpErrorResponse) => {
          if (error.status === 500) {
            this.messageService.add({
              severity: 'error',
              summary: 'Authentication Failed',
              detail: 'Check form details and try again.',
              key: 'tl',
              life: 3000,
            });
          } else if (error.status === 404) {
            this.messageService.add({
              severity: 'error',
              summary: 'Authentication Failed',
              detail: 'Error, try again.',
              key: 'tl',
              life: 3000,
            });
          } else if (error.status === 0) {
            this.messageService.add({
              severity: 'error',
              summary: 'Server Unreachable',
              detail:
                'Unable to connect to the server. Please check your internet connection.',
              key: 'tl',
              life: 3000,
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'An unexpected error occurred.',
              key: 'tl',
              life: 3000,
            });
          }
        }
      );
    }
  }

  removeCategory(id: number) {
    this.posService.deleteCategory(id).subscribe(async (data) => {
      if (data) {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: 'Failed to delete category.',
          key: 'tl',
          life: 3000,
        });
      } else {
        // this.loadCategory();
        this.messageService.add({
          severity: 'success',
          summary: 'Category deleted',
          detail: 'Category deleted successfully.',
          key: 'tl',
          life: 3000,
        });

        this.metadataService.removeCategoryFromState(id);
      }
    });
  }

  checkForEmptyFields<TObj extends object>(
    obj: TObj,
    fieldsToIgnore: ReadonlyArray<keyof TObj> = []
  ): boolean {
    return Object.entries(obj).some(
      ([key, value]) =>
        typeof value === 'string' &&
        value.trim() === '' &&
        !fieldsToIgnore.includes(key as unknown as keyof TObj)
    );
  }

  updateCategory() {
    if (!this.productCategory.name || !this.productCategory.code) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'category name and code are required.',
        key: 'tl',
        life: 3000,
      });
      return;
    }
  
    this.savingCategory = true;
    const categoryPayload = {
      id: this.editingCategory.id,
      name: this.productCategory.name,
      code: this.productCategory.code,
      description: this.productCategory.description,
      endDate: new Date(this.productCategory.endDate).toISOString()
    };
  
    this.posService.addCategory(categoryPayload).subscribe(
      (data) => {
        if (data) {
          this.messageService.add({
            severity: 'success',
            summary: 'category Updated',
            detail: 'category updated successfully.',
            key: 'tl',
            life: 3000,
          });
          
          // this.refreshTaxes();
          // this.cancelEditTax();
          this.editingCategory.name = categoryPayload.name
          this.editingCategory.code = categoryPayload.code
          this.editingCategory.description = categoryPayload.description
          this.editingCategory.endDate = categoryPayload.endDate
  
          this.editingCategory = {} 
          this.savingCategory = false
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: 'Failed to update category. Please try again.',
            key: 'tl',
            life: 3000,
          });
        }
        this.savingCategory = false;
      },
      (error: HttpErrorResponse) => {
        this.savingCategory = false;
        this.handleError(error, 'category');
      }
    );
  }
  
   editCategory(category: any) {
        this.editingCategory = category;
        this.productCategory = category
      }
  
  
   private handleError(error: HttpErrorResponse, type: string) {
      if (error.status === 500) {
        this.messageService.add({
          severity: 'error',
          summary: 'Server Error',
          detail: `Failed to process ${type}. Please check the details and try again.`,
          key: 'tl',
          life: 3000,
        });
      } else if (error.status === 404) {
        this.messageService.add({
          severity: 'error',
          summary: 'Not Found',
          detail: `Failed to process ${type}. The service is unavailable.`,
          key: 'tl',
          life: 3000,
        });
      } else if (error.status === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Connection Error',
          detail: 'Unable to connect to the server. Please check your internet connection.',
          key: 'tl',
          life: 3000,
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || `An unexpected error occurred while processing ${type}.`,
          key: 'tl',
          life: 3000,
        });
      }
    }

    cancelEdit() {
    this.editingCategory = {};
    this.productCategory = {
      id: 0,
      name: '',
      code: '',
      description: '',
      endDate: this._defaultExpiryDate.toISOString()
    }
  }
}
