import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from '../../../service/inventory/inventory.service';
import { Branch } from '../../../domain/inventory/inventory.dto';

@Component({
  selector: 'app-branch-form',
  templateUrl: './branch-form.component.html',
  styleUrls: ['./branch-form.component.scss']
})
export class BranchFormComponent implements OnInit, OnDestroy {
  branchForm!: FormGroup;
  isLoading: boolean = false;
  isSaving: boolean = false;
  error: string | null = null;
  branchId: string | null = null;
  mode: 'create' | 'edit' = 'create';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {
    this.buildForm();
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      // Check if editing a branch
      if (params['branchId'] && params['branchId'] !== 'new') {
        this.branchId = params['branchId'];
        this.mode = 'edit';
        this.loadBranchData();
      } else {
        this.mode = 'create';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.branchForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      code: ['', [Validators.required, Validators.minLength(2)]],
      type: ['STANDARD', Validators.required],
      status: ['ACTIVE', Validators.required],
      location: this.fb.group({
        address: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        country: ['Nigeria', Validators.required],
        postalCode: [''],
        lat: [''],
        lng: ['']
      }),
      contact: this.fb.group({
        phone: ['', Validators.required],
        email: ['', [Validators.email]],
        manager: ['', Validators.required]
      })
    });
  }

  private loadBranchData(): void {
    if (!this.branchId) return;
    this.isLoading = true;
    this.inventoryService.getBranch(this.branchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branch) => {
          this.populateForm(branch);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load branch:', err);
          this.error = 'Failed to load branch details.';
          this.isLoading = false;
        }
      });
  }

  private populateForm(branch: Branch): void {
    this.branchForm.patchValue({
      name: branch.name,
      code: branch.code,
      type: branch.type,
      status: branch.status,
      location: {
        address: branch.location?.address || '',
        city: branch.location?.city || '',
        state: branch.location?.state || '',
        country: branch.location?.country || 'Nigeria',
        postalCode: branch.location?.postalCode || '',
        lat: branch.location?.lat || '',
        lng: branch.location?.lng || ''
      },
      contact: {
        phone: branch.contact?.phone || '',
        email: branch.contact?.email || '',
        manager: branch.contact?.manager || ''
      }
    });
  }

  save(): void {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.error = null;
    const formValue = this.branchForm.value;

    if (this.mode === 'edit' && this.branchId) {
      this.inventoryService.updateBranch(this.branchId, formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.router.navigate(['/admin/sales/commerce/inventory/branches', this.branchId]);
          },
          error: (err) => {
            console.error('Failed to update branch:', err);
            this.error = 'Failed to update branch. Please try again.';
            this.isSaving = false;
          }
        });
    } else {
      this.inventoryService.createBranch(formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newBranch) => {
            this.isSaving = false;
            this.router.navigate(['/admin/sales/commerce/inventory/branches', newBranch.id]);
          },
          error: (err) => {
            console.error('Failed to create branch:', err);
            this.error = 'Failed to create branch. Please try again.';
            this.isSaving = false;
          }
        });
    }
  }

  cancel(): void {
    this.location.back();
  }
}
