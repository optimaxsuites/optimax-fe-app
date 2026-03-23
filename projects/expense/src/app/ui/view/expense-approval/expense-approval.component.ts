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

  expense: any;
  expenses: Expense[] = [];
  expenseId: string | null = null;
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
    const expenseId = this.route.snapshot.paramMap.get('id');
    console.log('Route param id:', expenseId);
    if (expenseId) {
      this.expenseId = expenseId;
      this.fetchExpenseById(expenseId);
    }
  }

  fetchExpenseById(id: string): void {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    this.expense = expenses.find((exp: { id: string }) => exp.id === id);

    if (this.expense) {
      console.log('Fetched expense from local storage:', this.expense);
    } else {
      console.log('Expense not found in local storage');
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/expenses']);
  }

  approveExpense(): void {
    if (this.expense) {
      this.expense.status = 'Approved';
      this.expenseService.updateExpense(this.expense.id, this.expense);
      this.router.navigate(['/admin/expenses']);
    }
  }

  rejectExpense(): void {
    if (this.expense) {
      this.expense.status = 'Rejected';
      this.expenseService.updateExpense(this.expense.id, this.expense);
      this.router.navigate(['/admin/expenses']);
    }
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
}