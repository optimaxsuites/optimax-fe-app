import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Router, ActivatedRoute } from '@angular/router';

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
  selector: 'app-housekeeping-form',
  templateUrl: './housekeeping-form.component.html',
  styleUrls: ['./housekeeping-form.component.scss'],
  providers: [MessageService],
})
export class HousekeepingFormComponent implements OnInit {
  foundForm: FormGroup;
  @Output() back = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.foundForm = this.fb.group({
      description: ['', Validators.required],
      foundBy: ['', Validators.required],
      foundAt: ['', Validators.required],
      storageLocation: ['', Validators.required],
      dateFound: [new Date(), Validators.required],
      notes: [''],
      linkedLostItemId: [''],
    });
  }

  goBack(): void {
    this.back.emit();
  }
  ngOnInit() {
    // Check for pre-filled data from lost item
    this.route.queryParams.subscribe((params) => {
      if (params['lostItemId']) {
        const lostItems = this.getLostItems();
        const lostItem = lostItems.find(
          (item) => item.id === params['lostItemId']
        );

        if (lostItem) {
          // Pre-fill the found form with lost item details
          this.foundForm.patchValue({
            description: lostItem.description,
            foundAt: lostItem.location || lostItem.placeOrRoom,
            storageLocation: lostItem.storageLocation || 'Front Desk',
            notes: `Recovered lost item. Originally reported by ${
              lostItem.personName || 'unknown'
            }`,
            linkedLostItemId: lostItem.id,
          });
        }
      }
    });
  }

  onSubmit() {
    if (this.foundForm.valid) {
      const newFoundItem: FoundItem = {
        id: this.generateId(),
        description: this.foundForm.value.description,
        foundBy: this.foundForm.value.foundBy,
        foundAt: this.foundForm.value.foundAt,
        storageLocation: this.foundForm.value.storageLocation,
        dateFound: new Date(this.foundForm.value.dateFound),
        status: 'unclaimed',
        notes: this.foundForm.value.notes,
        linkedLostItemId: this.foundForm.value.linkedLostItemId,
      };

      // Save to localStorage
      this.saveFoundItem(newFoundItem);

      // If this was linked to a lost item, update its status
      if (newFoundItem.linkedLostItemId) {
        this.updateLostItemStatus(newFoundItem.linkedLostItemId, 'found');
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Found item added successfully',
      });

      // Reset form
      this.resetForm();

      // Navigate to found items view
      this.router.navigate(['/housekeeping/found']);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill all required fields',
      });
    }
  }

  resetForm() {
    this.foundForm.reset({
      dateFound: new Date(),
    });
  }

  cancelForm() {
    // Navigate back or to found items view
    this.router.navigate(['/housekeeping/found']);
  }

  // Helper methods
  private saveFoundItem(item: FoundItem) {
    const foundItems = this.getFoundItems();
    foundItems.unshift(item); // Add to beginning of the array
    localStorage.setItem('foundItems', JSON.stringify(foundItems));
  }

  private getFoundItems(): FoundItem[] {
    const items = localStorage.getItem('foundItems');
    return items ? JSON.parse(items) : [];
  }

  private getLostItems(): any[] {
    const lostItems = localStorage.getItem('lostItems');
    return lostItems ? JSON.parse(lostItems) : [];
  }

  private updateLostItemStatus(lostItemId: string, status: string) {
    const lostItems = this.getLostItems();
    const index = lostItems.findIndex((item) => item.id === lostItemId);
    if (index !== -1) {
      lostItems[index].status = status;
      localStorage.setItem('lostItems', JSON.stringify(lostItems));
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}
