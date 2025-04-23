import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

interface LostItem {
  id: string;
  description: string;
  guestName: string;
  phoneNumber: string;
  placeOrRoom: string;
  dateReported: Date;
  dateLost?: Date;
  status: 'pending' | 'found' | 'resolved';
  notes?: string;
}

@Component({
  selector: 'app-housekeeping-lostitem',
  templateUrl: './housekeeping-lostitem.component.html',
  styleUrls: ['./housekeeping-lostitem.component.scss'],
  providers: [MessageService],
})
export class HousekeepingLostitemComponent implements OnInit {
  lostItems: LostItem[] = [];
  selectedItem: LostItem | null = null;
  filterStatus: string = 'all';
  searchText: string = '';
  openHousekeepingForm: boolean = false;

  statusOptions = [
    { label: 'All Items', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Found', value: 'found' },
    { label: 'Resolved', value: 'resolved' },
  ];

  menuItems = [
    {
      label: 'Edit Details',
      icon: 'pi pi-pencil',
      command: () => {
        if (this.selectedItem) {
          this.onEdit(this.selectedItem);
        }
      },
    },
    {
      label: 'Mark as Found',
      icon: 'pi pi-check-circle',
      command: () => {
        if (this.selectedItem) {
          this.onMarkAsFound(this.selectedItem);
        }
      },
      disabled: this.selectedItem?.status !== 'pending',
    },
    {
      label: 'Mark as Resolved',
      icon: 'pi pi-check-square',
      command: () => {
        if (this.selectedItem) {
          this.onResolve(this.selectedItem);
        }
      },
      disabled: this.selectedItem?.status === 'resolved',
    },
    { separator: true },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => {
        if (this.selectedItem) {
          this.onDelete(this.selectedItem);
        }
      },
    },
  ];

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadLostItems();
  }

  navigateToHouse() {
    this.openHousekeepingForm = true;
  }

  loadLostItems() {
    const items = localStorage.getItem('lostItems');
    if (items) {
      this.lostItems = JSON.parse(items).map((item: any) => ({
        ...item,
        dateReported: new Date(item.dateReported),
        dateLost: item.dateLost ? new Date(item.dateLost) : undefined,
      }));
    }
  }

  getFilteredItems() {
    return this.lostItems.filter((item) => {
      // Filter by status
      if (this.filterStatus !== 'all' && item.status !== this.filterStatus) {
        return false;
      }

      // Filter by search text
      if (this.searchText) {
        const searchLower = this.searchText.toLowerCase();
        return (
          item.description.toLowerCase().includes(searchLower) ||
          item.guestName.toLowerCase().includes(searchLower) ||
          item.placeOrRoom.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }

  onAddNew() {
    this.router.navigate(['/housekeeping/lost-form']);
  }

  onEdit(item: LostItem) {
    this.router.navigate(['/housekeeping/lost-form', item.id]);
  }

  onMarkAsFound(item: LostItem) {
    this.router.navigate(['/housekeeping/mark-as-found'], {
      queryParams: { lostItemId: item.id },
    });
  }

  onResolve(item: LostItem) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to mark this item as resolved?',
      header: 'Confirm Resolution',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Update the item status
        const updatedItems = this.lostItems.map((i) => {
          if (i.id === item.id) {
            return { ...i, status: 'resolved' as const };
          }
          return i;
        });

        localStorage.setItem('lostItems', JSON.stringify(updatedItems));
        this.loadLostItems();

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Item marked as resolved',
        });
      },
    });
  }

  onDelete(item: LostItem) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this lost item report?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const updatedItems = this.lostItems.filter((i) => i.id !== item.id);
        localStorage.setItem('lostItems', JSON.stringify(updatedItems));
        this.loadLostItems();

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Lost item report deleted',
        });
      },
    });
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'found':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'resolved':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  formatDate(date: Date | undefined) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}
