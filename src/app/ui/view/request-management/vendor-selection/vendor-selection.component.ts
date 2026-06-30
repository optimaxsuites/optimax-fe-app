// vendor-selection/vendor-selection.component.ts

import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { VendorSuggestion } from '../../../domain/procurement-request/procurement.dto';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';

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
    private route: ActivatedRoute
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
      this.procurementService.getRequest(this.requestId).subscribe({
        next: (req) => {
          this.procurementService.getVendorSuggestions(this.requestId).subscribe({
            next: (suggestions) => {
              this.vendors = suggestions;
              this.selectedVendors.clear();
              if (req && req.selectedVendors && req.selectedVendors.length > 0) {
                req.selectedVendors.forEach(vId => this.selectedVendors.add(vId));
              } else {
                // Auto-select top recommended vendors (up to 3)
                const recommended = this.vendors
                  .filter(v => v.isRecommended)
                  .slice(0, 3);
                recommended.forEach(v => this.selectedVendors.add(v.vendorId));
              }
              this.isLoading = false;
            },
            error: () => {
              this.loadMockVendors(req);
              this.isLoading = false;
            }
          });
        },
        error: () => {
          this.loadMockVendors();
          this.isLoading = false;
        }
      });
    } else {
      this.loadMockVendors();
      this.isLoading = false;
    }
  }

  loadMockVendors(req?: any): void {
    this.vendors = [
      {
        vendorId: 'v1',
        vendorName: 'TechPro Solutions Ltd',
        vendorCode: 'TPS001',
        categories: ['Electronics', 'IT Services', 'Hardware'],
        rating: 4.8,
        totalProjects: 156,
        completionRate: 98.5,
        averageResponseTime: 2.3,
        matchScore: 95,
        isRecommended: true,
        reason: 'Top-rated vendor with excellent track record'
      },
      {
        vendorId: 'v2',
        vendorName: 'Global Supplies Inc',
        vendorCode: 'GSI002',
        categories: ['Office Supplies', 'Furniture', 'Electronics'],
        rating: 4.6,
        totalProjects: 234,
        completionRate: 96.2,
        averageResponseTime: 3.1,
        matchScore: 89,
        isRecommended: true,
        reason: 'High completion rate and broad product range'
      },
      {
        vendorId: 'v3',
        vendorName: 'Quality Goods Co',
        vendorCode: 'QGC003',
        categories: ['Hardware', 'Tools', 'Industrial'],
        rating: 4.4,
        totalProjects: 89,
        completionRate: 94.8,
        averageResponseTime: 4.2,
        matchScore: 82,
        isRecommended: true,
        reason: 'Specialized in industrial equipment'
      },
      {
        vendorId: 'v4',
        vendorName: 'Express Logistics & Supply',
        vendorCode: 'ELS004',
        categories: ['Logistics', 'Warehousing', 'Transport'],
        rating: 4.2,
        totalProjects: 67,
        completionRate: 92.3,
        averageResponseTime: 5.1,
        matchScore: 76,
        isRecommended: false,
        reason: 'Good match for logistics requirements'
      },
      {
        vendorId: 'v5',
        vendorName: 'Premium Electronics Hub',
        vendorCode: 'PEH005',
        categories: ['Electronics', 'IT Services'],
        rating: 4.9,
        totalProjects: 203,
        completionRate: 99.1,
        averageResponseTime: 1.8,
        matchScore: 97,
        isRecommended: true,
        reason: 'Specialist in electronics with excellent reviews'
      },
      {
        vendorId: 'v6',
        vendorName: 'Consulting Partners Ltd',
        vendorCode: 'CPL006',
        categories: ['Consulting', 'Training', 'IT Services'],
        rating: 4.7,
        totalProjects: 145,
        completionRate: 97.4,
        averageResponseTime: 2.7,
        matchScore: 91,
        isRecommended: false,
        reason: 'Strong consulting background'
      }
    ];

    this.selectedVendors.clear();
    if (req && req.selectedVendors && req.selectedVendors.length > 0) {
      req.selectedVendors.forEach((vId: string) => this.selectedVendors.add(vId));
    } else {
      // Auto-select top 3 recommended
      const recommended = this.vendors.filter(v => v.isRecommended).slice(0, 3);
      recommended.forEach(v => this.selectedVendors.add(v.vendorId));
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
    if (this.selectedVendors.size > 0) {
      const uuid = this.route.snapshot.paramMap.get('uuid') || this.requestId;
      if (uuid) {
        this.procurementService.updateRequest(uuid, {
          selectedVendors: Array.from(this.selectedVendors)
        }).subscribe(() => {
          const typePath = this.router.url.includes('/service') ? 'service' : 'product';
          this.router.navigate(['admin/sales/commerce/requests/new', typePath, uuid, 'preview']);
        });
      }
    }
  }

  onBack(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid') || this.requestId;
    if (uuid) {
      const typePath = this.router.url.includes('/service') ? 'service' : 'product';
      this.router.navigate(['admin/sales/commerce/requests/new', typePath, uuid, 'template']);
    } else {
      this.router.navigate(['admin/sales/commerce/requests/new']);
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