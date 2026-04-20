import { Component, OnInit } from '@angular/core';
import { AccountingService } from '../../../services/accounting.service';
import { ToastService } from '../../../services/toast.service';
import { 
  JournalEntryDTO, 
  JournalEntryLineDTO, 
  PaginationResult 
} from '../../domain/accounting.dto';

@Component({
  selector: 'app-book-keeping',
  templateUrl: './book-keeping.component.html',
  styleUrl: './book-keeping.component.scss'
})
export class BookKeepingComponent implements OnInit {
  // Data
  journalEntries: JournalEntryDTO[] = [];
  selectedJournalLines: JournalEntryLineDTO[] = [];
  selectedJournal: JournalEntryDTO | null = null;

  // State
  loading = false;
  linesLoading = false;
  isLinesSidebarOpen = false;
  
  // Pagination
  totalRecords = 0;
  first = 0;
  rows = 10;

  constructor(
    private accountingService: AccountingService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadJournalEntries();
  }

  loadJournalEntries() {
    this.loading = true;
    this.accountingService.getJournalEntries(this.first / this.rows, this.rows).subscribe({
      next: (res: PaginationResult<JournalEntryDTO>) => {
        this.journalEntries = res.content || [];
        this.totalRecords = res.totalSize || 0;
        this.loading = false;
      },
      error: () => {
        this.toastService.error('Failed to load journal entries');
        this.loading = false;
      }
    });
  }

  viewJournalLines(entry: JournalEntryDTO) {
    this.selectedJournal = entry;
    this.isLinesSidebarOpen = true;
    this.loadJournalLines(entry.id);
  }

  loadJournalLines(journalId: number) {
    this.linesLoading = true;
    this.accountingService.getJournalLines(0, 100, journalId).subscribe({
      next: (res: PaginationResult<JournalEntryLineDTO>) => {
        this.selectedJournalLines = res.content || [];
        this.linesLoading = false;
      },
      error: () => {
        this.toastService.error('Failed to load journal lines');
        this.linesLoading = false;
      }
    });
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.loadJournalEntries();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'POSTED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'DRAFT': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'REVERSED': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }
}
