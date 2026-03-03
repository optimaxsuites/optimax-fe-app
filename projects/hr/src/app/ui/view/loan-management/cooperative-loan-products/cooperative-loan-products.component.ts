import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoanProduct } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-loan-products',
  templateUrl: './cooperative-loan-products.component.html',
  styleUrls: ['./cooperative-loan-products.component.scss']
})
export class CooperativeLoanProductsComponent implements OnInit {
  products: CooperativeLoanProduct[] = [];
  showProductForm = false;
  editingProductId: string | null = null;
  productForm!: FormGroup;

  constructor(
    private cooperativeService: CooperativeService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadProducts();
  }

  initializeForm(): void {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      minAmount: [1000, [Validators.required, Validators.min(1)]],
      maxAmount: [10000, [Validators.required, Validators.min(1)]],
      interestRate: [0, [Validators.required, Validators.min(0)]],
      minDuration: [1, [Validators.required, Validators.min(1)]],
      maxDuration: [12, [Validators.required, Validators.min(1)]],
      requiresShares: [false],
      patronageEligible: [true],
      patronageRate: [0, [Validators.required, Validators.min(0)]],
      status: ['ACTIVE', Validators.required]
    });

    this.productForm.get('patronageEligible')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.productForm.get('patronageRate')?.setValue(0);
      }
    });
  }

  loadProducts(): void {
    this.products = this.cooperativeService.getProducts();
  }

  openAddForm(): void {
    this.editingProductId = null;
    this.showProductForm = true;
    this.productForm.reset({
      name: '',
      description: '',
      minAmount: 1000,
      maxAmount: 10000,
      interestRate: 0,
      minDuration: 1,
      maxDuration: 12,
      requiresShares: false,
      patronageEligible: true,
      patronageRate: 0,
      status: 'ACTIVE'
    });
  }

  openEditForm(product: CooperativeLoanProduct): void {
    this.editingProductId = product.id;
    this.showProductForm = true;
    this.productForm.patchValue(product);
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const formValue = this.productForm.value;
    if (Number(formValue.minAmount) > Number(formValue.maxAmount)) {
      this.productForm.get('maxAmount')?.setErrors({ range: true });
      return;
    }

    if (Number(formValue.minDuration) > Number(formValue.maxDuration)) {
      this.productForm.get('maxDuration')?.setErrors({ range: true });
      return;
    }

    const payload = {
      ...formValue,
      minAmount: Number(formValue.minAmount),
      maxAmount: Number(formValue.maxAmount),
      interestRate: Number(formValue.interestRate),
      minDuration: Number(formValue.minDuration),
      maxDuration: Number(formValue.maxDuration),
      patronageRate: Number(formValue.patronageRate)
    } as Omit<CooperativeLoanProduct, 'id'>;

    if (this.editingProductId) {
      this.cooperativeService.updateProduct({ id: this.editingProductId, ...payload });
    } else {
      this.cooperativeService.addProduct(payload);
    }

    this.cancelForm();
    this.loadProducts();
  }

  toggleProductStatus(product: CooperativeLoanProduct): void {
    const nextStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.cooperativeService.setProductStatus(product.id, nextStatus);
    this.loadProducts();
  }

  cancelForm(): void {
    this.showProductForm = false;
    this.editingProductId = null;
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/dashboard', uuidV4()]);
  }
}
