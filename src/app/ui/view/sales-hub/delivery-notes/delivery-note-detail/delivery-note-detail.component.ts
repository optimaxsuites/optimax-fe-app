import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer, DeliveryNote, DeliveryNoteStatus, MerchantInfo } from '../../../../domain/sales/sales.dto';
import { formatApiDate, formatApiDateTime } from '../../../../service/sales/date.util';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-delivery-note-detail',
  standalone: true,
  imports: [CommonModule, BackButtonComponent, ToastModule],
  providers: [MessageService],
  templateUrl: './delivery-note-detail.component.html',
  styleUrls: ['./delivery-note-detail.component.scss']
})
export class DeliveryNoteDetailComponent implements OnInit, OnDestroy {
  @Input() detailId?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();

  note: DeliveryNote | null = null;
  customers: Customer[] = [];
  merchantInfo: MerchantInfo | null = null;
  orderId: string | null = null;
  isLoading = true;
  isDownloading = false;
  isUpdatingStatus = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService,
    private messageService: MessageService
  ) { }

  // Same navigation-staleness fix as the other detail pages in this module — subscribes to the
  // live paramMap instead of reading route.snapshot once, so navigating between two different
  // delivery notes' URLs actually reloads instead of reusing the previous one.
  ngOnInit(): void {
    this.salesService.getCustomers({ page: 0, size: 200 }).pipe(takeUntil(this.destroy$)).subscribe(res => this.customers = res.data);
    this.salesService.getMyMerchantInfo().pipe(takeUntil(this.destroy$)).subscribe(merchant => this.merchantInfo = merchant);

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = this.detailId || params.get('id');
      if (id) {
        this.loadNote(id);
      } else {
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNote(id: string): void {
    this.isLoading = true;
    this.salesService.getDeliveryNoteById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (note) => {
        this.note = note;
        this.isLoading = false;
        if (note?.salesOrderId != null) this.loadOrderId(note.salesOrderId);
      },
      error: (err) => {
        console.error('Error loading delivery note:', err);
        this.isLoading = false;
      }
    });
  }

  private loadOrderId(transactionId: number): void {
    this.salesService.getOrderIdLookup().subscribe(lookup => {
      this.orderId = lookup.byTransactionId.get(transactionId) || null;
    });
  }

  get customerName(): string {
    const customer = this.customers.find(c => c.id === this.note?.customerId);
    return customer?.name || 'Customer';
  }

  canEdit(): boolean {
    return this.note?.status === 'PENDING';
  }

  canMarkDispatched(): boolean {
    return this.note?.status === 'PENDING';
  }

  canMarkDelivered(): boolean {
    return this.note?.status === 'DISPATCHED';
  }

  editNote(): void {
    if (!this.note?.id) return;
    if (this.edit.observed) {
      this.edit.emit(String(this.note.id));
      return;
    }
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/delivery-notes', this.note.id, 'edit', uuid] : ['/admin/sales/delivery-notes', this.note.id, 'edit'];
    this.router.navigate(path);
  }

  updateStatus(status: DeliveryNoteStatus): void {
    if (!this.note?.id || this.isUpdatingStatus) return;
    this.isUpdatingStatus = true;
    this.salesService.updateDeliveryNoteStatus(this.note.id, status).subscribe({
      next: (updated) => {
        this.isUpdatingStatus = false;
        this.note = { ...this.note!, status: updated?.status || status };
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Delivery note marked as ${status.toLowerCase()}.` });
      },
      error: (err) => {
        console.error('Error updating delivery note status:', err);
        this.isUpdatingStatus = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status. Please try again.' });
      }
    });
  }

  goBack(): void {
    if (this.closed.observed) {
      this.closed.emit();
      return;
    }
    this.router.navigate(['/admin/sales/sales-hub']);
  }

  downloadPDF(): void {
    const element = document.getElementById('delivery-note-detail-sheet');
    if (!element) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to find delivery note to generate PDF.' });
      return;
    }
    this.isDownloading = true;
    setTimeout(() => {
      html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`DeliveryNote-${this.note?.deliveryNumber || 'note'}.pdf`);
        this.isDownloading = false;
      }).catch(err => {
        console.error('Error generating PDF:', err);
        this.isDownloading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to build PDF document.' });
      });
    }, 100);
  }

  printNote(): void {
    window.print();
  }

  formatDate(date: any): string {
    return formatApiDate(date, { day: 'numeric', month: 'short', year: 'numeric' }, 'en-NG', '—');
  }

  formatDateTime(date: any): string {
    return formatApiDateTime(date, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }, 'en-NG', '—');
  }

  /** Maps the backend's PENDING status to the stylesheet's `--draft` suffix (visually the same
   *  "not yet dispatched" gray look) since there's no dedicated `--pending` badge style here. */
  getStatusBadgeClass(status: string | undefined): string {
    const classes: Record<string, string> = {
      PENDING: 'draft',
      DISPATCHED: 'dispatched',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled'
    };
    return classes[status || 'PENDING'] || 'draft';
  }
}
