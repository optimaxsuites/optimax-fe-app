import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { VendorService } from '../../../service/vendor-portal/vendor.service';
import {
  VendorDocument, DocumentStats,
  DocumentCategory, DocumentStatus,
  VendorProfile, DocumentTemplate, TemplateDocType,
} from '../../../domain/vendor-portal/vendor.dto';

type CategoryFilter = 'all' | DocumentCategory;
type ProfileTab = 'profile' | 'documents' | 'branding';

@Component({
  selector: 'app-vendor-profile',
  templateUrl: './vendor-profile.component.html',
  styleUrl: './vendor-profile.component.scss',
})
export class VendorProfileComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  activeTab: ProfileTab = 'profile';

  // ── Profile ───────────────────────────────────────────────────────────────────
  profile: VendorProfile | null = null;

  // ── Documents (existing behaviour, unchanged) ───────────────────────────────────
  allDocs:  VendorDocument[] = [];
  docs:     VendorDocument[] = [];
  stats:    DocumentStats | null = null;
  filter:   CategoryFilter  = 'all';

  showUploadModal = false;
  uploadForm = {
    name:      '',
    category:  'registration' as DocumentCategory,
    fileName:  '',
    fileSize:  '',
    fileType:  'pdf',
    expiryDate: '',
    notes:     '',
    isRequired: false,
  };
  uploadErrors: Partial<Record<keyof typeof this.uploadForm, string>> = {};

  showDeleteConfirm = false;
  docToDelete: VendorDocument | null = null;

  showPanel    = false;
  selectedDoc: VendorDocument | null = null;

  readonly categoryFilters: { label: string; value: CategoryFilter }[] = [
    { label: 'All',            value: 'all' },
    { label: 'Registration',   value: 'registration' },
    { label: 'Tax',            value: 'tax' },
    { label: 'Licence',        value: 'licence' },
    { label: 'Insurance',      value: 'insurance' },
    { label: 'Certification',  value: 'certification' },
    { label: 'Other',          value: 'other' },
  ];

  readonly categoryOptions: { label: string; value: DocumentCategory }[] = [
    { label: 'Registration',  value: 'registration' },
    { label: 'Tax',           value: 'tax' },
    { label: 'Licence',       value: 'licence' },
    { label: 'Insurance',     value: 'insurance' },
    { label: 'Certification', value: 'certification' },
    { label: 'Other',         value: 'other' },
  ];

  // ── Branding / Document Templates ────────────────────────────────────────────
  templateDocType: TemplateDocType = 'invoice';
  templates: DocumentTemplate[] = [];
  editingTemplate: DocumentTemplate | null = null;

  templateForm = {
    name:            '',
    accentColor:     '#224957',
    footerText:      '',
    showBankDetails: true,
    notesDefault:    '',
  };

  // Preview only reflects what's in the form right now, live, before saving.
  // Sample data is static on purpose — the point is to preview the *styling*,
  // not pull a real invoice.
  readonly previewSample = {
    docNumber:   'INV-2026-0148',
    date:        'June 28, 2026',
    clientName:  'Lagos Continental Hotels Ltd',
    items: [
      { name: 'Industrial Air Compressor (5HP)', qty: 2, unitPrice: 185000, total: 370000 },
      { name: 'Safety Valve Assembly',            qty: 6, unitPrice: 12500,  total: 75000  },
    ],
    subtotal: 445000,
    tax:      33375,
    total:    478375,
  };

  constructor(private vendorService: VendorService) {}

  ngOnInit(): void {
    this.vendorService.getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe(p => this.profile = p);

    this.vendorService.getDocuments()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => { this.allDocs = list; this.applyFilter(); });
    this.vendorService.getDocumentStats().pipe(take(1)).subscribe(s => this.stats = s);

    this.loadTemplates();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  setTab(tab: ProfileTab): void { this.activeTab = tab; }

  // ════════════════════════════════════════════════════════════════════════════
  //  PROFILE  (view-only for now)
  // ════════════════════════════════════════════════════════════════════════════
  verificationBadge(status: VendorProfile['verificationStatus']): string {
    const m: Record<VendorProfile['verificationStatus'], string> = {
      verified:   'badge badge-active',
      pending:    'badge badge-pending',
      unverified: 'badge badge-expired',
    };
    return m[status] ?? 'badge';
  }

  verificationLabel(status: VendorProfile['verificationStatus']): string {
    const m: Record<VendorProfile['verificationStatus'], string> = {
      verified: 'Verified', pending: 'Pending Verification', unverified: 'Not Verified',
    };
    return m[status] ?? status;
  }

  maskAccountNumber(num: string): string {
    if (num.length <= 4) return num;
    return `${'•'.repeat(num.length - 4)}${num.slice(-4)}`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  DOCUMENTS  (unchanged behaviour from the original component)
  // ════════════════════════════════════════════════════════════════════════════
  setFilter(f: CategoryFilter): void { this.filter = f; this.applyFilter(); }

  private applyFilter(): void {
    this.docs = this.filter === 'all'
      ? this.allDocs
      : this.allDocs.filter(d => d.category === this.filter);
  }

  openPanel(doc: VendorDocument): void { this.selectedDoc = doc; this.showPanel = true; }
  closePanel(): void { this.showPanel = false; this.selectedDoc = null; }

  openUploadModal(): void {
    this.uploadForm = { name: '', category: 'registration', fileName: '', fileSize: '', fileType: 'pdf', expiryDate: '', notes: '', isRequired: false };
    this.uploadErrors = {};
    this.showUploadModal = true;
  }

  closeUploadModal(): void { this.showUploadModal = false; }

  simulateFilePick(): void {
    this.uploadForm.fileName = `document_${Date.now()}.pdf`;
    this.uploadForm.fileSize = '1.2 MB';
    this.uploadForm.fileType = 'pdf';
  }

  submitUpload(): void {
    this.uploadErrors = {};
    if (!this.uploadForm.name.trim()) { this.uploadErrors['name'] = 'Document name is required.'; }
    if (!this.uploadForm.fileName)    { this.uploadErrors['fileName'] = 'Please select a file.'; }
    if (Object.keys(this.uploadErrors).length > 0) return;

    this.vendorService.uploadDocument({
      name:        this.uploadForm.name.trim(),
      category:    this.uploadForm.category,
      fileUrl:     '#',
      fileName:    this.uploadForm.fileName,
      fileSize:    this.uploadForm.fileSize || '—',
      fileType:    this.uploadForm.fileType,
      expiryDate:  this.uploadForm.expiryDate ? new Date(this.uploadForm.expiryDate) : undefined,
      notes:       this.uploadForm.notes || undefined,
      isRequired:  this.uploadForm.isRequired,
    });

    this.vendorService.getDocumentStats().pipe(take(1)).subscribe(s => this.stats = s);
    this.closeUploadModal();
  }

  openDeleteConfirm(doc: VendorDocument, e: MouseEvent): void {
    e.stopPropagation();
    this.docToDelete = doc; this.showDeleteConfirm = true;
  }
  closeDeleteConfirm(): void { this.showDeleteConfirm = false; this.docToDelete = null; }

  confirmDelete(): void {
    if (!this.docToDelete) return;
    this.vendorService.deleteDocument(this.docToDelete.id);
    this.vendorService.getDocumentStats().pipe(take(1)).subscribe(s => this.stats = s);
    if (this.selectedDoc?.id === this.docToDelete.id) { this.closePanel(); }
    this.closeDeleteConfirm();
  }

  downloadDoc(doc: VendorDocument, e: MouseEvent): void {
    e.stopPropagation();
    console.log('[Profile/Documents] Download:', doc.fileName);
  }

  fmtDate(d: Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  daysUntilExpiry(d: Date): number {
    return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  statusBadge(status: DocumentStatus): string {
    const m: Record<DocumentStatus, string> = {
      active:         'badge-active',
      expiring_soon:  'badge-expiring',
      expired:        'badge-expired',
      pending_review: 'badge-pending',
    };
    return `badge ${m[status] ?? ''}`;
  }

  statusLabel(status: DocumentStatus): string {
    const m: Record<DocumentStatus, string> = {
      active: 'Active', expiring_soon: 'Expiring Soon',
      expired: 'Expired', pending_review: 'Pending Review',
    };
    return m[status] ?? status;
  }

  categoryLabel(cat: DocumentCategory): string {
    const m: Record<DocumentCategory, string> = {
      registration: 'Registration', tax: 'Tax', licence: 'Licence',
      insurance: 'Insurance', certification: 'Certification', other: 'Other',
    };
    return m[cat] ?? cat;
  }

  categoryIcon(cat: DocumentCategory): string {
    const m: Record<DocumentCategory, string> = {
      registration: '🏢', tax: '🧾', licence: '📋',
      insurance: '🛡️', certification: '🎖️', other: '📄',
    };
    return m[cat] ?? '📄';
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  BRANDING  (document templates for invoices/quotations)
  // ════════════════════════════════════════════════════════════════════════════
  private loadTemplates(): void {
    this.vendorService.getTemplates(this.templateDocType)
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.templates = list;
        // Default the editor to whichever template is currently active
        const active = list.find(t => t.isActive);
        if (active && !this.editingTemplate) {
          this.loadTemplateIntoForm(active);
        }
      });
  }

  setTemplateDocType(type: TemplateDocType): void {
    this.templateDocType = type;
    this.editingTemplate = null;
    this.loadTemplates();
  }

  loadTemplateIntoForm(template: DocumentTemplate): void {
    this.editingTemplate = template;
    this.templateForm = {
      name:            template.name,
      accentColor:     template.accentColor,
      footerText:       template.footerText || '',
      showBankDetails: template.showBankDetails,
      notesDefault:    template.notesDefault || '',
    };
  }

  startNewTemplate(): void {
    this.editingTemplate = null;
    this.templateForm = {
      name:            'New Template',
      accentColor:     '#224957',
      footerText:      '',
      showBankDetails: this.templateDocType === 'invoice',
      notesDefault:    '',
    };
  }

  saveTemplate(): void {
    if (!this.templateForm.name.trim()) return;

    this.vendorService.saveTemplate({
      name:            this.templateForm.name.trim(),
      docType:         this.templateDocType,
      isActive:        this.editingTemplate?.isActive ?? false,
      accentColor:     this.templateForm.accentColor,
      footerText:      this.templateForm.footerText || undefined,
      showBankDetails: this.templateForm.showBankDetails,
      notesDefault:    this.templateForm.notesDefault || undefined,
    }, this.editingTemplate?.id);

    this.loadTemplates();
  }

  setActiveTemplate(template: DocumentTemplate): void {
    this.vendorService.setActiveTemplate(template.id, this.templateDocType);
    this.loadTemplates();
  }

  deleteTemplate(template: DocumentTemplate, e: MouseEvent): void {
    e.stopPropagation();
    if (template.isActive) return; // guard: can't delete the active template
    this.vendorService.deleteTemplate(template.id);
    if (this.editingTemplate?.id === template.id) this.editingTemplate = null;
    this.loadTemplates();
  }

  fmtCurrency(n: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
  }
}