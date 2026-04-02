import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PosServiceService } from '../../../service/pos-service.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-update-stock',
  templateUrl: './update-stock.component.html',
  styleUrl: './update-stock.component.scss'
})
export class UpdateStockComponent implements OnInit {
  stockMovementForm!: FormGroup;
  ingredients: any[] = [];
  suppliers: any[] = [];
  selectedIngredient: any;
  ingredientDetails: any = {
    sku: '',
    code: '',
    purchasePrice: 0,
    currentStock: 0,
    reorderThreshold: 0,
    measurementUnit: '',
    supplier: { name: 'N/A' },
    branches: [],
  };

  constructor(
    private fb: FormBuilder,
    private posService: PosServiceService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.stockMovementForm = this.fb.group({
      movementType: ['Incoming', Validators.required],
      movementDate: [this.formatDate(new Date()), Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]],
      reference: [''],
      supplierId: [null, Validators.required],
      purchasePrice: [null, Validators.required],
      sellingPrice: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadIngredients();
    this.loadSuppliers();
    this.onMovementTypeChange();
  }

  loadIngredients() {
    this.posService.getIngredient().subscribe({
      next: (data) => {
        this.ingredients = data;
        this.checkRouteAndPopulateForm();
      },
      error: (error) => {
        console.error('Error loading ingredients:', error);
      }
    });
  }

  checkRouteAndPopulateForm() {
    this.route.paramMap.subscribe(params => {
      const uuid = params.get('uuid');
      if (uuid) {
        const ingredient = this.ingredients.find(item => item.uuid === uuid);
        if (ingredient) {
          this.selectedIngredient = ingredient;
          this.onIngredientSelect();
        }
      }
    });
  }

  loadSuppliers() {
    this.posService.getSupplier().subscribe({
      next: (data) => this.suppliers = data,
      error: (error) => console.error('Error loading suppliers:', error)
    });
  }

  onIngredientSelect() {
    if (this.selectedIngredient) {
      this.ingredientDetails = {
        sku: this.selectedIngredient.sku,
        code: this.selectedIngredient.code,
        purchasePrice: this.selectedIngredient.purchasePrice,
        currentStock: this.selectedIngredient.currentStock,
        reorderThreshold: this.selectedIngredient.reorderThreshold,
        measurementUnit: this.selectedIngredient.measurementUnit,
        supplier: this.selectedIngredient.supplier,
        branches: this.selectedIngredient.branches,
      };

      this.stockMovementForm.patchValue({
        purchasePrice: this.selectedIngredient.purchasePrice,
        sellingPrice: this.selectedIngredient.sellingPrice,
        supplierId: this.selectedIngredient.supplier?.id,
      });
    }
  }

  onMovementTypeChange() {
    const movementType = this.stockMovementForm.get('movementType')?.value;
    const supplierControl = this.stockMovementForm.get('supplierId');
    const purchasePriceControl = this.stockMovementForm.get('purchasePrice');
    const sellingPriceControl = this.stockMovementForm.get('sellingPrice');

    if (movementType === 'Outgoing') {
      supplierControl?.clearValidators();
      supplierControl?.disable();
      purchasePriceControl?.clearValidators();
      purchasePriceControl?.disable();
      sellingPriceControl?.clearValidators();
      sellingPriceControl?.disable();
    } else {
      supplierControl?.setValidators(Validators.required);
      supplierControl?.enable();
      purchasePriceControl?.setValidators(Validators.required);
      purchasePriceControl?.enable();
      sellingPriceControl?.setValidators(Validators.required);
      sellingPriceControl?.enable();
    }
    supplierControl?.updateValueAndValidity();
    purchasePriceControl?.updateValueAndValidity();
    sellingPriceControl?.updateValueAndValidity();
  }

  getBranchNames(): string {
    if (!this.ingredientDetails.branches || this.ingredientDetails.branches.length === 0) {
      return 'N/A';
    }
    return this.ingredientDetails.branches.map((branch: any) => branch.name).join(', ');
  }

  onSubmit() {
    if (this.stockMovementForm.valid && this.selectedIngredient) {
      const formValue = this.stockMovementForm.value;

      let finalQuantity = formValue.quantity;
      if (formValue.movementType === 'Outgoing') {
        finalQuantity = -Math.abs(finalQuantity);
      } else {
        finalQuantity = Math.abs(finalQuantity);
      }

      let finalSupplierId = formValue.supplierId;
      if (typeof formValue.supplierId === 'object' && formValue.supplierId !== null) {
        finalSupplierId = formValue.supplierId.id;
      }

      const ingredientId = this.selectedIngredient?.id;
      const inventoryId = this.selectedIngredient?.inventoryId ?? ingredientId;

      if (!ingredientId || !inventoryId) {
        console.error('❌ Missing ingredientId or inventoryId:', { ingredientId, inventoryId });
        alert('Ingredient or inventory ID is missing. Cannot submit stock movement.');
        return;
      }

      const payload = {
  ingredientId,
  inventoryId: this.selectedIngredient.inventoryId,
  quantity: finalQuantity,
  reference: formValue.reference,
  createdDate: new Date(formValue.movementDate).toISOString(),
  purchasePrice: formValue.purchasePrice || 0,
  sellingPrice: formValue.sellingPrice || 0,
};

      console.log(' Sending payload:', payload);

      this.posService.createStockMovement(payload).subscribe({
        next: (response) => {
          console.log(' Stock movement recorded:', response);
          const idOrUuid = this.selectedIngredient.uuid || this.selectedIngredient.id;
          this.router.navigate(['/ingredients', idOrUuid]);
        },
        error: (error) => {
          console.error('❌ Error recording stock movement:', error);
          const msg = error?.error?.message || error?.message || 'Server error';
          alert('Failed to record stock movement: ' + msg);
        }
      });
    } else {
      console.error('❌ Form is invalid or no ingredient is selected.');
    }
  }

  navigateToPrevious() {
    this.router.navigate(['/ingredients', this.selectedIngredient?.uuid || 'uuid-placeholder']);
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) {
      month = '0' + month;
    }
    if (day.length < 2) {
      day = '0' + day;
    }
    return [year, month, day].join('-');
  }
}
