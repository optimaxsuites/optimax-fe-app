// vendor-selection/vendor-selection.component.ts

import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { VendorSuggestion } from '../../../domain/procurement-request/procurement.dto';
import { ExtendedProcurementRequest, parseIdToNumber } from '../../../service/procurement/rfq-quotation-bridge.util';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-vendor-selection',
  templateUrl: './vendor-selection.component.html',
  styleUrls: ['./vendor-selection.component.scss']
})
export class VendorSelectionComponent implements OnInit {
  @Input() requestId: string = '';
  @Input() requestData: any = {};
  @Output() vendorsSelected = new EventEmitter<string[]>();
  @Output() back = new EventEmitter<void>();

  vendors: VendorSuggestion[] = [];
  selectedVendors: Set<string> = new Set();
  isLoading = false;
  searchTerm = '';
  filterCategory = '';

  get categories(): string[] {
    const allCategories = this.vendors.flatMap(v => v.categories);
    return [...new Set(allCategories)];
  }

  constructor(
    private fb: FormBuilder,
    private procurementService: ProcurementRequestService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.requestId = uuid;
    }
    this.loadVendorSuggestions();
  }

  loadVendorSuggestions(): void {
    this.isLoading = true;
    if (this.requestId) {
      this.procurementService.getRequest(parseIdToNumber(this.requestId)).subscribe({
        next: (req) => {
          const extendedReq = req as ExtendedProcurementRequest;
          this.procurementService.getVendorSuggestions(parseIdToNumber(this.requestId)).subscribe({
            next: (suggestions) => {
              this.vendors = suggestions;
              this.selectedVendors.clear();
              if (extendedReq && extendedReq.selectedVendors && extendedReq.selectedVendors.length > 0) {
                extendedReq.selectedVendors.forEach((vId: any) => this.selectedVendors.add(vId));
              } else {
                // Auto-select top recommended vendors (up to 3)
                const recommended = this.vendors
                   .filter(v => v.isRecommended)
                   .slice(0, 3);
                recommended.forEach(v => this.selectedVendors.add(v.vendorId));
              }
              this.isLoading = false;
            },
            error: (err: any) => {
              console.error('Error loading vendor suggestions:', err);
              this.vendors = [];
              this.isLoading = false;
            }
          });
        },
        error: (err: any) => {
          console.error('Error loading request for vendor suggestions:', err);
          this.vendors = [];
          this.isLoading = false;
        }
      });
    } else {
      this.vendors = [];
      this.isLoading = false;
    }
  }

  toggleVendor(vendorId: string): void {
    if (this.selectedVendors.has(vendorId)) {
      this.selectedVendors.delete(vendorId);
    } else {
      // Limit to 3 selections
      if (this.selectedVendors.size < 3) {
        this.selectedVendors.add(vendorId);
      } else {
        // Show feedback that max is 3
        console.warn('Maximum 3 vendors can be selected');
      }
    }
  }

  isVendorSelected(vendorId: string): boolean {
    return this.selectedVendors.has(vendorId);
  }

  getSelectedCount(): number {
    return this.selectedVendors.size;
  }

  getMaxVendors(): number {
    return 3;
  }

  getFilteredVendors(): VendorSuggestion[] {
    let filtered = this.vendors;
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.vendorName.toLowerCase().includes(term) ||
        v.vendorCode.toLowerCase().includes(term) ||
        v.categories.some(c => c.toLowerCase().includes(term))
      );
    }
    
    if (this.filterCategory) {
      filtered = filtered.filter(v => 
        v.categories.includes(this.filterCategory)
      );
    }
    
    return filtered;
  }

  onNext(): void {
    if (this.selectedVendors.size === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select at least one vendor to continue.' });
      return;
    }
    const uuid = this.route.snapshot.paramMap.get('uuid') || this.requestId;
    if (!uuid) return;

    this.procurementService.updateRequest(parseIdToNumber(uuid), {
      selectedVendors: Array.from(this.selectedVendors)
    } as any).subscribe({
      next: () => {
        const typePath = this.router.url.includes('/service') ? 'service' : 'product';
        this.router.navigate(['/admin/sales/commerce/requests/new', typePath, uuid, 'preview']);
      },
      error: (err) => {
        console.error('Failed to save selected vendors', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save your vendor selection. Please try again.' });
      }
    });
  }

  onBack(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid') || this.requestId;
    if (uuid) {
      const typePath = this.router.url.includes('/service') ? 'service' : 'product';
      this.router.navigate(['/admin/sales/commerce/requests/new', typePath, uuid, 'template']);
    } else {
      this.router.navigate(['/admin/sales/commerce/requests/new']);
    }
  }

  getMatchColor(score: number): string {
    if (score >= 90) return '#184440';
    if (score >= 75) return '#2a736e';
    if (score >= 60) return '#e8a838';
    return '#e53e3e';
  }

  getRatingStars(rating: number): string {
    return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
  }
}