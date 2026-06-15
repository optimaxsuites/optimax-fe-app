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
  foundBy?: string;
  foundContact?: string;
  foundNotes?: string;
  foundDate?: Date;
  itemCategory?: string;
  roomNumber: string;
}

@Component({
  selector: 'app-housekeeping-lostitem',
  templateUrl: './housekeeping-lostitem.component.html',
  styleUrls: ['./housekeeping-lostitem.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class HousekeepingLostitemComponent implements OnInit {
  lostItems: LostItem[] = [];
  selectedItem: LostItem | null = null;
  filterStatus: string = 'all';
  searchText: string = '';
  openHousekeepingForm: boolean = false;
  displayDetailsDialog: boolean = false;

  statusOptions = [
    { label: 'All Items', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Found', value: 'found' },
  ];

  MenuItems(item: LostItem) {
    return [
      {
        label: 'Edit Details',
        icon: 'pi pi-pencil',
        command: () => this.onEdit(item),
        visible: item.status !== 'found',
      },
      {
        label: 'Mark as Found',
        icon: 'pi pi-check-circle',
        command: () => this.onMarkAsFound(item),
        visible: item.status === 'pending',
      },

      { separator: true },
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => this.viewDetails(item),
      },
    ];
  }

  displayMarkAsFoundDialog: boolean = false;
  foundDetails: any = {
    foundBy: '',
    contactNumber: '',
    notes: '',
  };

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadLostItems();
  }

  navigateToHouse() {
    this.openHousekeepingForm = !this.openHousekeepingForm;
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
    this.router.navigate(['/hospitality/housekeeping/lost-form']);
  }

  onEdit(item: LostItem) {
    this.selectedItem = item;

    this.router.navigate(['/hospitality/housekeeping/lost-form']);
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

  viewDetails(item: LostItem) {
    this.selectedItem = item;
    this.displayDetailsDialog = true;
  }

  onMarkAsFound(item: LostItem) {
    this.selectedItem = item;
    this.foundDetails = {
      // Reset form
      foundBy: '',
      contactNumber: '',
      notes: '',
    };
    this.displayMarkAsFoundDialog = true;
  }

  confirmMarkAsFound() {
    if (!this.foundDetails.foundBy) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter the name of who found the item',
      });
      return;
    }

    const updatedItems = this.lostItems.map((i) => {
      if (i.id === this.selectedItem?.id) {
        return {
          ...i,
          status: 'found',
          foundBy: this.foundDetails.foundBy,
          foundContact: this.foundDetails.contactNumber,
          foundNotes: this.foundDetails.notes,
          foundDate: new Date(),
        };
      }
      return i;
    });

    localStorage.setItem('lostItems', JSON.stringify(updatedItems));
    this.loadLostItems();
    this.displayMarkAsFoundDialog = false;

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Item marked as found',
    });
  }
}
