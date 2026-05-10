import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpenseService, Expense } from '../../service/expense.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { SafeUrlPipe } from '../../sharedComponent/safe-url.pipe';

@Component({
  selector: 'app-expense-approval',
  templateUrl: './expense-approval.component.html',
  styleUrls: ['./expense-approval.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, SafeUrlPipe]
})
export class ExpenseApprovalComponent implements OnInit {

  expense: Expense | null = null;
  expenses: Expense[] = [];
  expenseId: string | null = null;
  isLoading = false;
  isSubmitting = false;
  loadError = '';
  dropdownOpen = false;
  showFileModal = false;
  fileModalUrl = '';
  fileModalTitle = '';
  fileModalLoading = false;
  fileModalError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private expenseService: ExpenseService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    sessionStorage.removeItem('pendingApprovalRedirect');
    localStorage.removeItem('pendingApprovalRedirect');
    sessionStorage.removeItem('postLoginRedirect');
    localStorage.removeItem('postLoginRedirect');
    const expenseId = this.route.snapshot.paramMap.get('id');
    console.log('Route param id:', expenseId);
    if (expenseId) {
      this.expenseId = expenseId;
      this.fetchExpenseById(expenseId);
    }
  }

  fetchExpenseById(id: string): void {
    this.isLoading = true;
    this.loadError = '';
    this.expenseService.getExpenseById(id).subscribe({
      next: (expense) => {
        this.expense = this.normalizeExpenseMedia(expense);
        this.isLoading = false;
        console.log('Fetched expense from API:', this.expense);
      },
      error: (error) => {
        console.error('Expense not found from API:', error);
        this.isLoading = false;
        this.loadError = 'Expense could not be loaded.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/expenses']);
  }

  approveExpense(): void {
    if (!this.expense || this.isSubmitting) return;
    this.isSubmitting = true;
    this.expenseService.approveExpense(this.expense).subscribe({
      next: (expense) => {
        this.expense = this.normalizeExpenseMedia(expense);
        this.isSubmitting = false;
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  rejectExpense(): void {
    if (!this.expense || this.isSubmitting) return;
    const reason = window.prompt('Enter rejection reason', this.expense.rejectionReason || '');
    if (reason === null) return;

    this.isSubmitting = true;
    this.expenseService.rejectExpense(this.expense, reason).subscribe({
      next: (expense) => {
        this.expense = this.normalizeExpenseMedia(expense);
        this.isSubmitting = false;
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  downloadExpense(): void {
    // Implement download logic here
  }

  emailExpense(): void {
    // Implement email logic here
  }

  exportExpense(): void {
    // Implement export as PDF logic here
  }

  editExpense(): void {
    if (this.expense) {
      this.router.navigate(['/admin/expenses/expensesForm'], {
        queryParams: { id: this.expense.id }
      });
    }
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  // ── Receipt URL Helpers ────────────────────────────────────────

  /**
   * Converts a raw file path (e.g. /opt/optimax/media/.../dEIC46E4ORK)
   * or a plain filename into a full web-accessible URL using the
   * expenses images endpoint — exactly the same logic as expense-table.
   */
  getReceiptWebUrl(path: string | undefined): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const filename = path.split('/').pop() || path;
    return `https://be.optimaxsuites.com/x/api/v2/exp/expenses/images/${filename}`;
  }

  /** Returns just the last segment of a path for display purposes. */
  getFileName(path: string | undefined): string {
    if (!path) return '';
    return path.split('/').pop() || path;
  }

  // ── File Preview Modal Logic ───────────────────────────────────

  openFileModal(url: string, title: string): void {
    if (!url) return;
    this.fileModalUrl = url;
    this.fileModalTitle = title;
    this.fileModalLoading = true;
    this.fileModalError = '';
    this.showFileModal = true;
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
  }

  closeFileModal(): void {
    this.showFileModal = false;
    this.fileModalUrl = '';
    this.fileModalTitle = '';
    this.fileModalLoading = false;
    this.fileModalError = '';
    document.body.style.overflow = '';
  }

  onFileModalLoad(): void {
    this.fileModalLoading = false;
  }

  onFileModalError(): void {
    this.fileModalLoading = false;
    this.fileModalError =
      'The file could not be loaded — it may require additional authentication. ' +
      'Use "Open in New Tab" to view it directly.';
  }

  /** Returns true if the URL looks like an image (jpg / png / gif / webp). */
  isImageUrl(url: string): boolean {
    const lower = (url || '').toLowerCase().split('?')[0];
    return /\.(jpe?g|png|gif|webp|bmp|svg)$/.test(lower);
  }

  /** Returns true if the URL looks like a PDF. */
  isPdfUrl(url: string): boolean {
    return (url || '').toLowerCase().split('?')[0].endsWith('.pdf');
  }

  /**
   * Sanitizes an iframe src URL so Angular doesn't block it.
   * Used for PDF previews inside the modal.
   */
  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  get merchantName(): string {
    return this.expense?.merchant?.name || '—';
  }

  get categoryName(): string {
    return this.expense?.category?.name || '—';
  }

  get formattedEventDate(): string {
    const value = this.expense?.eventDate;
    if (!value) return '—';
    if (Array.isArray(value) && value.length >= 3) {
      return new Date(value[0], value[1] - 1, value[2]).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    const parsed = new Date(value as string);
    return isNaN(parsed.getTime())
      ? String(value)
      : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get expenseByName(): string {
    return this.expense?.expenseBy?.fullname || this.expense?.expenseBy?.username || '—';
  }

  get expenseByEmail(): string {
    return this.expense?.expenseBy?.email || '—';
  }

  get approvedByName(): string {
    return this.expense?.approvedBy?.fullname || this.expense?.approvedBy?.username || '—';
  }

  get approvedByEmail(): string {
    return this.expense?.approvedBy?.email || '—';
  }

  get rejectedByName(): string {
    return this.expense?.rejectedBy?.fullname || this.expense?.rejectedBy?.username || '—';
  }

  get rejectedByEmail(): string {
    return this.expense?.rejectedBy?.email || '—';
  }

  get statusClass(): string {
    switch (this.expense?.status) {
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      default: return 'status-pending';
    }
  }

  get receiptAttachments(): Array<{ title: string; url: string }> {
    if (!this.expense) return [];
    const attachments: Array<{ title: string; url: string }> = [];

    const pushMedia = (title: string, media?: any) => {
      if (media?.url) attachments.push({ title, url: this.getReceiptWebUrl(media.url) });
    };

    pushMedia('Company Receipt', this.expense.companyReceipt);
    pushMedia('Employee Receipt', this.expense.expenseReceipt);

    (this.expense.companyReceipts || []).forEach((media, index) =>
      pushMedia(`Company Receipt ${index + 1}`, media)
    );
    (this.expense.expenseReceipts || []).forEach((media, index) =>
      pushMedia(`Employee Receipt ${index + 1}`, media)
    );

    const seen = new Set<string>();
    return attachments.filter((attachment) => {
      if (seen.has(attachment.url)) return false;
      seen.add(attachment.url);
      return true;
    });
  }

  canApproveOrReject(): boolean {
    return this.expense?.status === 'PENDING';
  }

  formatAmount(value: number | string | null | undefined): string {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
  }

  private normalizeExpenseMedia(expense: Expense): Expense {
    const normalizeMedia = (media: any) =>
      media ? { ...media, url: this.getReceiptWebUrl(media.url || media.name || media.mediaNo) } : media;

    return {
      ...expense,
      companyReceipt: normalizeMedia(expense.companyReceipt),
      expenseReceipt: normalizeMedia(expense.expenseReceipt),
      companyReceipts: Array.isArray(expense.companyReceipts)
        ? expense.companyReceipts.map(normalizeMedia)
        : [],
      expenseReceipts: Array.isArray(expense.expenseReceipts)
        ? expense.expenseReceipts.map(normalizeMedia)
        : [],
    };
  }
}
