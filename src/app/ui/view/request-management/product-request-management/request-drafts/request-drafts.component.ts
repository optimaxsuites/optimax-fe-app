// src/app/ui/view/procurement-request-management/request-drafts/request-drafts.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';
import { RequestDraftService } from '../../../../service/procurement-request-management/product-request-management/request-draft.service';
import { RequestDraft, DraftSummary, DraftFilters, DraftStatus } from '../../../../domain/procurement-request/product-requests/request-draft.dto';

@Component({
  selector: 'app-request-drafts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './request-drafts.component.html',
  styleUrls: ['./request-drafts.component.scss']
})
export class RequestDraftsComponent implements OnInit, OnDestroy {
  
  drafts: RequestDraft[] = [];
  summary: DraftSummary | null = null;
  isLoading = true;
  
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  selectedDraft: RequestDraft | null = null;
  showDeleteConfirm = false;
  draftToDelete: RequestDraft | null = null;
  isConverting = false;
  
  filters: DraftFilters = {
    status: 'ALL',
    searchTerm: '',
    page: 0,
    size: 10,
    sortBy: 'lastModified',
    sortOrder: 'desc'
  };
  
  statusOptions: { value: DraftStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Drafts' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETION_STARTED', label: 'Almost Complete' },
    { value: 'AWAITING_INFO', label: 'Needs Info' },
    { value: 'EXPIRED', label: 'Expired' }
  ];
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private draftService: RequestDraftService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadDrafts();
    this.loadSummary();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadDrafts(): void {
    this.isLoading = true;
    this.draftService.getDrafts(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.drafts = response.data;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading drafts:', error);
          this.isLoading = false;
        }
      });
  }
  
  loadSummary(): void {
    this.draftService.getDraftSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.summary = summary;
        },
        error: (error) => {
          console.error('Error loading summary:', error);
        }
      });
  }
  
  onFilterChange(): void {
    this.filters.page = 0;
    this.loadDrafts();
  }
  
  onSearch(): void {
    this.filters.page = 0;
    this.loadDrafts();
  }
  
  resetFilters(): void {
    this.filters = {
      status: 'ALL',
      searchTerm: '',
      page: 0,
      size: 10,
      sortBy: 'lastModified',
      sortOrder: 'desc'
    };
    this.loadDrafts();
  }
  
  onPageChange(page: number): void {
    this.filters.page = page;
    this.loadDrafts();
  }
  
  onPageSizeChange(size: number): void {
    this.filters.size = size;
    this.filters.page = 0;
    this.loadDrafts();
  }
  
  openDraft(draft: RequestDraft): void {
    this.router.navigate(['/commerce/requests/draft', draft.id]);
  }
  
  continueEditing(draft: RequestDraft): void {
    this.router.navigate(['/commerce/requests/edit-draft', draft.id]);
  }
  
  confirmDelete(draft: RequestDraft): void {
    this.draftToDelete = draft;
    this.showDeleteConfirm = true;
  }
  
  deleteDraft(): void {
    if (this.draftToDelete) {
      this.draftService.deleteDraft(this.draftToDelete.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadDrafts();
            this.loadSummary();
            this.showDeleteConfirm = false;
            this.draftToDelete = null;
          },
          error: (error) => {
            console.error('Error deleting draft:', error);
          }
        });
    }
  }
  
  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.draftToDelete = null;
  }
  
  convertToRequest(draft: RequestDraft): void {
    this.isConverting = true;
    this.selectedDraft = draft;
    
    this.draftService.convertToRequest(draft.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isConverting = false;
          if (result.success) {
            this.router.navigate(['/commerce/requests', result.requestId]);
          }
        },
        error: (error) => {
          console.error('Error converting draft:', error);
          this.isConverting = false;
        }
      });
  }
  
  createNewDraft(): void {
    this.router.navigate(['/admin/sales/commerce/requests/new/' + uuidV4()], { queryParams: { draft: true } });
  }

  goBackToRequests(): void {
    this.router.navigate(['/admin/sales/commerce/requests/home/' + uuidV4()]);
  }
  
  getStatusIcon(status: DraftStatus): string {
    const icons: Record<DraftStatus, string> = {
      'IN_PROGRESS': 'edit',
      'COMPLETION_STARTED': 'check-circle',
      'AWAITING_INFO': 'info',
      'EXPIRED': 'clock'
    };
    return icons[status];
  }
  
  getStatusClass(status: DraftStatus): string {
    const classes: Record<DraftStatus, string> = {
      'IN_PROGRESS': 'status-progress',
      'COMPLETION_STARTED': 'status-complete',
      'AWAITING_INFO': 'status-awaiting',
      'EXPIRED': 'status-expired'
    };
    return classes[status];
  }
  
  getStatusLabel(status: DraftStatus): string {
    const labels: Record<DraftStatus, string> = {
      'IN_PROGRESS': 'In Progress',
      'COMPLETION_STARTED': 'Almost Complete',
      'AWAITING_INFO': 'Needs Info',
      'EXPIRED': 'Expired'
    };
    return labels[status];
  }
  
  formatDate(date: Date): string {
    if (!date) return 'N/A';
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  }
  
  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  }
  
  getProgressColor(progress: number): string {
    if (progress < 30) return '#dc2626';
    if (progress < 70) return '#f59e0b';
    return '#2EB270';
  }
  
  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);
    
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  getPaginationEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }
}