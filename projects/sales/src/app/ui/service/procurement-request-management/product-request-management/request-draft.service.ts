import { Injectable } from '@angular/core';
import { Observable, of, delay, map } from 'rxjs';
import { RequestDraft, DraftSummary, DraftFilters, DraftStatus, DraftAttachment } from '../../../domain/procurement-request/product-requests/request-draft.dto';

@Injectable({
  providedIn: 'root'
})
export class RequestDraftService {

  private mockDrafts: RequestDraft[] = [
    {
      id: 'DRF-001',
      customerId: 'CUST-001',
      customerName: 'John Doe Enterprises',
      productName: 'Office Laptops',
      description: '15 high-performance laptops for accounting department',
      quantity: 15,
      budget: 22500,
      currency: 'NGN',
      deliveryLocation: 'Lagos, Nigeria',
      deliveryDeadline: new Date('2026-06-15'),
      specialInstructions: 'Need Dell XPS series',
      attachments: [],
      status: 'IN_PROGRESS',
      progress: 65,
      lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      tags: ['urgent', 'electronics']
    },
    {
      id: 'DRF-002',
      customerId: 'CUST-001',
      customerName: 'John Doe Enterprises',
      productName: 'Office Chairs',
      description: '30 ergonomic office chairs',
      quantity: 30,
      budget: 4500,
      currency: 'NGN',
      deliveryLocation: 'Lagos, Nigeria',
      specialInstructions: '',
      attachments: [],
      status: 'AWAITING_INFO',
      progress: 40,
      lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      tags: ['furniture']
    },
    {
      id: 'DRF-003',
      customerId: 'CUST-001',
      customerName: 'John Doe Enterprises',
      productName: 'Network Switches',
      description: '10 Cisco network switches',
      quantity: 10,
      budget: 8000,
      currency: 'NGN',
      deliveryLocation: 'Abuja, Nigeria',
      deliveryDeadline: new Date('2026-05-25'),
      specialInstructions: '',
      attachments: [],
      status: 'COMPLETION_STARTED',
      progress: 85,
      lastModified: new Date(Date.now() - 30 * 60 * 1000),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      tags: ['networking']
    }
  ];

  getDrafts(filters: DraftFilters): Observable<{ data: RequestDraft[]; totalElements: number; totalPages: number }> {
    let filtered = [...this.mockDrafts];
    
    if (filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter(d => d.status === filters.status);
    }
    
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.productName.toLowerCase().includes(search) ||
        d.id.toLowerCase().includes(search) ||
        d.description.toLowerCase().includes(search)
      );
    }
    
    const start = filters.page * filters.size;
    const paginated = filtered.slice(start, start + filters.size);
    
    return of({
      data: paginated,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / filters.size)
    }).pipe(delay(500));
  }

  getDraftById(id: string): Observable<RequestDraft | undefined> {
    return of(this.mockDrafts.find(d => d.id === id)).pipe(delay(300));
  }

  saveDraft(draftData: Partial<RequestDraft>): Observable<RequestDraft> {
    const existingIndex = this.mockDrafts.findIndex(d => d.id === draftData.id);
    
    if (existingIndex >= 0) {
      // Update existing draft
      const updated = { ...this.mockDrafts[existingIndex], ...draftData, lastModified: new Date() };
      this.mockDrafts[existingIndex] = updated;
      return of(updated).pipe(delay(500));
    } else {
      // Create new draft
      const newDraft: RequestDraft = {
        id: 'DRF-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        customerId: draftData.customerId || 'CUST-001',
        customerName: draftData.customerName || 'John Doe Enterprises',
        productName: draftData.productName || '',
        description: draftData.description || '',
        quantity: draftData.quantity || 1,
        budget: draftData.budget || 0,
        currency: draftData.currency || 'NGN',
        deliveryLocation: draftData.deliveryLocation || '',
        deliveryDeadline: draftData.deliveryDeadline,
        specialInstructions: draftData.specialInstructions || '',
        attachments: draftData.attachments || [],
        status: 'IN_PROGRESS',
        progress: this.calculateProgress(draftData),
        lastModified: new Date(),
        createdAt: new Date(),
        tags: draftData.tags || [],
        notes: draftData.notes || ''
      };
      this.mockDrafts.unshift(newDraft);
      return of(newDraft).pipe(delay(500));
    }
  }

  deleteDraft(id: string): Observable<boolean> {
    const index = this.mockDrafts.findIndex(d => d.id === id);
    if (index >= 0) {
      this.mockDrafts.splice(index, 1);
    }
    return of(true).pipe(delay(500));
  }

  convertToRequest(draftId: string): Observable<{ success: boolean; requestId: string }> {
    const draft = this.mockDrafts.find(d => d.id === draftId);
    if (draft) {
      // Remove draft after conversion
      this.deleteDraft(draftId);
      return of({
        success: true,
        requestId: 'REQ-' + Math.random().toString(36).substr(2, 6).toUpperCase()
      }).pipe(delay(800));
    }
    return of({ success: false, requestId: '' }).pipe(delay(500));
  }

  getDraftSummary(): Observable<DraftSummary> {
    const drafts = this.mockDrafts;
    const now = new Date();
    const expiringSoon = drafts.filter(d => d.expiresAt && new Date(d.expiresAt) < new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)).length;
    
    return of({
      totalDrafts: drafts.length,
      expiringSoon: expiringSoon,
      mostRecentDraft: drafts[0] || null,
      completionRate: drafts.reduce((acc, d) => acc + d.progress, 0) / (drafts.length || 1)
    }).pipe(delay(300));
  }

  autoSaveDraft(formData: any, customerId: string, customerName: string): Observable<RequestDraft> {
    const progress = this.calculateProgress(formData);
    return this.saveDraft({
      customerId,
      customerName,
      productName: formData.productName,
      description: formData.description,
      quantity: formData.quantity,
      budget: formData.budget,
      currency: formData.currency,
      deliveryLocation: formData.deliveryLocation,
      deliveryDeadline: formData.deliveryDeadline,
      specialInstructions: formData.specialInstructions,
      progress: progress,
      status: progress === 100 ? 'COMPLETION_STARTED' : 'IN_PROGRESS'
    });
  }

  private calculateProgress(formData: any): number {
    let completed = 0;
    let total = 7; // Number of important fields
    
    if (formData.productName && formData.productName.trim()) completed++;
    if (formData.description && formData.description.trim()) completed++;
    if (formData.quantity && formData.quantity > 0) completed++;
    if (formData.budget && formData.budget > 0) completed++;
    if (formData.deliveryLocation && formData.deliveryLocation.trim()) completed++;
    if (formData.deliveryDeadline) completed++;
    if (formData.specialInstructions && formData.specialInstructions.trim()) completed++;
    
    return Math.round((completed / total) * 100);
  }
}