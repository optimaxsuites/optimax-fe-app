import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

interface FoundItem {
  id: string;
  description: string;
  foundBy: string;
  foundAt: string;
  storageLocation: string;
  dateFound: Date;
  status: 'unclaimed' | 'claimed';
  claimedBy?: string;
  claimDate?: Date;
  identification?: string;
  contactNumber?: string;
  notes?: string;
  linkedLostItemId?: string;
}

@Component({
  selector: 'app-housekeeping-found',
  templateUrl: './housekeeping-found.component.html',
  styleUrls: ['./housekeeping-found.component.scss'],
  providers: [MessageService],
})
export class HousekeepingFoundComponent implements OnInit {
  activeTab: 'unclaimed' | 'claimed' = 'unclaimed';
  unclaimedItems: FoundItem[] = [];
  claimedItems: FoundItem[] = [];
  selectedItem: FoundItem | null = null;
  displayDetailsDialog = false;
  displayClaimDialog = false;
  itemToClaim: FoundItem | null = null;
  claimForm: FormGroup;

  openFoundForm: boolean = false;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private router: Router
  ) {
    this.claimForm = this.fb.group({
      claimedBy: ['', Validators.required],
      identification: ['', Validators.required],
      contactNumber: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadItems();
  }

  switchTab(tab: 'unclaimed' | 'claimed') {
    this.activeTab = tab;
  }

  navigateToHouse() {
    this.openFoundForm = !this.openFoundForm;
  }

  loadItems() {
    // Load found items from localStorage
    const foundItems = localStorage.getItem('foundItems');
    if (foundItems) {
      const allItems: FoundItem[] = JSON.parse(foundItems);

      // Convert string dates to Date objects
      allItems.forEach((item) => {
        item.dateFound = new Date(item.dateFound);
        if (item.claimDate) {
          item.claimDate = new Date(item.claimDate);
        }
      });

      this.unclaimedItems = allItems.filter(
        (item) => item.status === 'unclaimed'
      );
      this.claimedItems = allItems.filter((item) => item.status === 'claimed');
    } else {
      // Initialize with empty arrays
      this.unclaimedItems = [];
      this.claimedItems = [];
    }
  }

  addNewFoundItem() {
    this.router.navigate(['/housekeeping/found/add']);
  }

  viewDetails(item: FoundItem) {
    this.selectedItem = item;
    this.displayDetailsDialog = true;
  }

  showClaimDialog(item: FoundItem) {
    this.itemToClaim = item;
    this.claimForm.reset();
    this.displayClaimDialog = true;
  }

  submitClaim() {
    if (this.claimForm.valid && this.itemToClaim) {
      const claimedItem = {
        ...this.itemToClaim,
        status: 'claimed' as 'claimed',
        claimedBy: this.claimForm.value.claimedBy,
        identification: this.claimForm.value.identification,
        contactNumber: this.claimForm.value.contactNumber,
        claimDate: new Date(),
      };

      // Remove from unclaimed and add to claimed
      this.unclaimedItems = this.unclaimedItems.filter(
        (item) => item.id !== this.itemToClaim?.id
      );
      this.claimedItems.unshift(claimedItem);

      // If this was linked to a lost item, update its status to resolved
      if (claimedItem.linkedLostItemId) {
        this.updateLostItemStatus(claimedItem.linkedLostItemId, 'resolved');
      }

      this.saveAllItems();
      this.displayClaimDialog = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Item claimed successfully',
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill all required fields',
      });
    }
  }

  private updateLostItemStatus(lostItemId: string, status: string) {
    const lostItems = this.getLostItems();
    const index = lostItems.findIndex((item) => item.id === lostItemId);
    if (index !== -1) {
      lostItems[index].status = status;
      localStorage.setItem('lostItems', JSON.stringify(lostItems));
    }
  }

  private getLostItems(): any[] {
    const lostItems = localStorage.getItem('lostItems');
    return lostItems ? JSON.parse(lostItems) : [];
  }

  private saveAllItems() {
    const allItems = [...this.unclaimedItems, ...this.claimedItems];
    localStorage.setItem('foundItems', JSON.stringify(allItems));
  }
}
