// src/app/ui/view/procurement-request-management/vendor-rating/vendor-rating.component.ts

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface VendorRatingData {
  vendorId: string;
  vendorName: string;
  requestId: string;
  productName: string;
  overallRating: number;
  communicationRating: number;
  deliveryRating: number;
  qualityRating: number;
  valueRating: number;
  review: string;
  pros?: string[];
  cons?: string[];
  wouldRecommend: boolean;
  tags?: string[];
  anonymous?: boolean;
}

export interface VendorRatingResponse {
  success: boolean;
  ratingId: string;
  message: string;
}

@Component({
  selector: 'app-vendor-rating',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './vendor-rating.component.html',
  styleUrls: ['./vendor-rating.component.scss']
})
export class VendorRatingComponent implements OnInit, OnDestroy {
  
  @Input() vendorId: string = '';
  @Input() vendorName: string = '';
  @Input() requestId: string = '';
  @Input() productName: string = '';
  @Input() deliveryDate: Date = new Date();
  @Output() ratingSubmitted = new EventEmitter<VendorRatingResponse>();
  @Output() closed = new EventEmitter<void>();
  
  ratingForm: FormGroup;
  isSubmitting = false;
  currentStep = 1;
  totalSteps = 3;
  
  // Rating state
  hoverRating = 0;
  selectedOverallRating = 0;
  
  // Sub-ratings
  selectedCommunication = 0;
  selectedDelivery = 0;
  selectedQuality = 0;
  selectedValue = 0;
  
  // Quick tags
  quickTags = [
    { label: 'Fast Delivery', icon: 'rocket', selected: false, category: 'positive' },
    { label: 'Good Communication', icon: 'message', selected: false, category: 'positive' },
    { label: 'Quality Product', icon: 'star', selected: false, category: 'positive' },
    { label: 'Fair Price', icon: 'tag', selected: false, category: 'positive' },
    { label: 'Professional', icon: 'briefcase', selected: false, category: 'positive' },
    { label: 'Late Delivery', icon: 'clock', selected: false, category: 'negative' },
    { label: 'Poor Quality', icon: 'alert', selected: false, category: 'negative' },
    { label: 'Bad Communication', icon: 'phone-off', selected: false, category: 'negative' },
    { label: 'Overpriced', icon: 'trending-up', selected: false, category: 'negative' },
    { label: 'Damaged Package', icon: 'package-x', selected: false, category: 'negative' }
  ];
  
  // Predefined pros and cons
  prosOptions = [
    'On-time delivery', 'Great packaging', 'Friendly service', 
    'Accurate order', 'Good value', 'Professional handling'
  ];
  consOptions = [
    'Late delivery', 'Poor packaging', 'Rude service', 
    'Wrong items', 'Overpriced', 'Damaged goods'
  ];
  
  selectedPros: string[] = [];
  selectedCons: string[] = [];
  customPro = '';
  customCon = '';
  
  private destroy$ = new Subject<void>();

  private getStorageKey(): string {
    return `vendor-rating:${this.requestId}:${this.vendorId}`;
  }

  constructor(
    private fb: FormBuilder,
    @Optional() private dialogRef: MatDialogRef<VendorRatingComponent, VendorRatingResponse | null>,
    @Optional() @Inject(MAT_DIALOG_DATA)
    private dialogData: Partial<VendorRatingData> & { deliveryDate?: Date } | null
  ) {
    this.ratingForm = this.fb.group({
      overallRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      communicationRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      deliveryRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      qualityRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      valueRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      review: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      wouldRecommend: [true, Validators.required],
      anonymous: [false],
      tags: [[]]
    });
  }

  ngOnInit(): void {
    if (this.dialogData) {
      this.vendorId = this.dialogData.vendorId ?? this.vendorId;
      this.vendorName = this.dialogData.vendorName ?? this.vendorName;
      this.requestId = this.dialogData.requestId ?? this.requestId;
      this.productName = this.dialogData.productName ?? this.productName;
      this.deliveryDate = this.dialogData.deliveryDate ?? this.deliveryDate;
    }

    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormListeners(): void {
    this.ratingForm.get('communicationRating')?.valueChanges.subscribe(val => {
      this.selectedCommunication = val;
    });
    this.ratingForm.get('deliveryRating')?.valueChanges.subscribe(val => {
      this.selectedDelivery = val;
    });
    this.ratingForm.get('qualityRating')?.valueChanges.subscribe(val => {
      this.selectedQuality = val;
    });
    this.ratingForm.get('valueRating')?.valueChanges.subscribe(val => {
      this.selectedValue = val;
    });
  }

  setOverallRating(rating: number): void {
    this.selectedOverallRating = rating;
    this.ratingForm.patchValue({ overallRating: rating });
  }

  setHoverRating(rating: number): void {
    this.hoverRating = rating;
  }

  clearHoverRating(): void {
    this.hoverRating = 0;
  }

  getOverallStarIcon(rating: number): string {
    if (this.hoverRating > 0) {
      return rating <= this.hoverRating ? 'star-filled' : 'star-outline';
    }
    return rating <= this.selectedOverallRating ? 'star-filled' : 'star-outline';
  }

  getStarIcon(ratingValue: number, currentRating: number): string {
    return ratingValue <= currentRating ? 'star-filled' : 'star-outline';
  }

  setSubRating(ratingType: string, value: number): void {
    this.ratingForm.patchValue({ [ratingType]: value });
  }

  toggleTag(tag: any): void {
    tag.selected = !tag.selected;
    const currentTags = this.ratingForm.get('tags')?.value || [];
    if (tag.selected) {
      this.ratingForm.patchValue({ tags: [...currentTags, tag.label] });
    } else {
      this.ratingForm.patchValue({ tags: currentTags.filter((t: string) => t !== tag.label) });
    }
  }

  togglePro(pro: string): void {
    if (this.selectedPros.includes(pro)) {
      this.selectedPros = this.selectedPros.filter(p => p !== pro);
    } else {
      this.selectedPros.push(pro);
    }
  }

  toggleCon(con: string): void {
    if (this.selectedCons.includes(con)) {
      this.selectedCons = this.selectedCons.filter(c => c !== con);
    } else {
      this.selectedCons.push(con);
    }
  }

  addCustomPro(): void {
    if (this.customPro.trim() && !this.selectedPros.includes(this.customPro.trim())) {
      this.selectedPros.push(this.customPro.trim());
      this.customPro = '';
    }
  }

  addCustomCon(): void {
    if (this.customCon.trim() && !this.selectedCons.includes(this.customCon.trim())) {
      this.selectedCons.push(this.customCon.trim());
      this.customCon = '';
    }
  }

  removePro(pro: string): void {
    this.selectedPros = this.selectedPros.filter(p => p !== pro);
  }

  removeCon(con: string): void {
    this.selectedCons = this.selectedCons.filter(c => c !== con);
  }

  nextStep(): void {
    if (this.currentStep === 1 && !this.ratingForm.get('overallRating')?.value) {
      alert('Please select an overall rating before continuing');
      return;
    }
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  closeModal(): void {
    this.closed.emit();
    this.dialogRef?.close(null);
  }

  onSubmit(): void {
    if (this.ratingForm.invalid) {
      // Mark all fields as touched
      Object.keys(this.ratingForm.controls).forEach(key => {
        this.ratingForm.get(key)?.markAsTouched();
      });
      
      if (!this.ratingForm.get('review')?.value) {
        alert('Please write a review before submitting');
      } else if (this.ratingForm.get('review')?.invalid) {
        alert('Review must be between 10 and 500 characters');
      }
      return;
    }

    this.isSubmitting = true;
    
    const ratingData: VendorRatingData = {
      vendorId: this.vendorId,
      vendorName: this.vendorName,
      requestId: this.requestId,
      productName: this.productName,
      overallRating: this.ratingForm.get('overallRating')?.value,
      communicationRating: this.ratingForm.get('communicationRating')?.value,
      deliveryRating: this.ratingForm.get('deliveryRating')?.value,
      qualityRating: this.ratingForm.get('qualityRating')?.value,
      valueRating: this.ratingForm.get('valueRating')?.value,
      review: this.ratingForm.get('review')?.value,
      pros: this.selectedPros,
      cons: this.selectedCons,
      wouldRecommend: this.ratingForm.get('wouldRecommend')?.value,
      tags: this.ratingForm.get('tags')?.value,
      anonymous: this.ratingForm.get('anonymous')?.value
    };

    // Simulate API call - replace with actual service
    setTimeout(() => {
      localStorage.setItem(this.getStorageKey(), JSON.stringify({
        ...ratingData,
        submittedAt: new Date().toISOString()
      }));

      const response: VendorRatingResponse = {
        success: true,
        ratingId: 'RATING-' + Math.random().toString(36).substr(2, 9),
        message: 'Thank you for your feedback! Your rating has been submitted.'
      };
      this.isSubmitting = false;
      this.ratingSubmitted.emit(response);
      this.dialogRef?.close(response);
    }, 1000);
  }

  getAverageSubRating(): number {
    const sum = this.selectedCommunication + this.selectedDelivery + 
                this.selectedQuality + this.selectedValue;
    return sum / 4;
  }

  getPositiveTagsCount(): number {
    return this.quickTags.filter(t => t.selected && t.category === 'positive').length;
  }

  getNegativeTagsCount(): number {
    return this.quickTags.filter(t => t.selected && t.category === 'negative').length;
  }

  getStarRatingText(rating: number): string {
    if (rating === 5) return 'Excellent';
    if (rating === 4) return 'Good';
    if (rating === 3) return 'Average';
    if (rating === 2) return 'Poor';
    return 'Terrible';
  }
}