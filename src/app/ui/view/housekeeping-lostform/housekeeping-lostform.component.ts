import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';

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
  itemCategory?: string;
  valueEstimate?: string;
  roomNumber?: string;
}

@Component({
  selector: 'app-housekeeping-lostform',
  templateUrl: './housekeeping-lostform.component.html',
  styleUrls: ['./housekeeping-lostform.component.scss'],
  providers: [MessageService],
})
export class HousekeepingLostformComponent implements OnInit {
  [x: string]: any;
  lostForm: FormGroup;
  isEditMode = false;
  editItemId: string | null = null;
  @Output() back = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.lostForm = this.fb.group({
      description: ['', Validators.required],
      guestName: ['', Validators.required],
      phoneNumber: ['', Validators.pattern(/^\d{10}$/)],
      placeOrRoom: ['', Validators.required],
      dateReported: [new Date(), Validators.required],
      dateLost: [null],
      notes: [''],
      status: ['pending'],
      itemCategory: [''],
      valueEstimate: [''],
      roomNumber: [''],
    });
  }

  ngOnInit() {
    // Check if we're editing an existing item
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.editItemId = params['id'];
        this.isEditMode = true;
        if (this.editItemId) {
          this.loadItemData(this.editItemId);
        }
      }
    });
  }

  goBack(): void {
    this.back.emit();
  }

  loadItemData(id: string) {
    const lostItems = localStorage.getItem('lostItems');
    if (lostItems) {
      const items: LostItem[] = JSON.parse(lostItems);
      const item = items.find((i) => i.id === id);
      if (item) {
        this.lostForm.patchValue({
          description: item.description,
          guestName: item.guestName,
          phoneNumber: item.phoneNumber || '',
          placeOrRoom: item.placeOrRoom,
          dateReported: new Date(item.dateReported),
          dateLost: item.dateLost ? new Date(item.dateLost) : null,
          notes: item.notes || '',
          status: item.status,
          itemCategory: item.itemCategory || 'other',
          valueEstimate: item.valueEstimate || '',
          roomNumber: item.roomNumber || '',
        });
      }
    }
  }

  onSubmit() {
    if (this.lostForm.invalid) {
      Object.keys(this.lostForm.controls).forEach((key) => {
        const control = this.lostForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
      return;
    }

    const formData = this.lostForm.value;
    const lostItem: LostItem = {
      id: this.isEditMode && this.editItemId ? this.editItemId : this.uuidv4(),
      description: formData.description,
      guestName: formData.guestName,
      phoneNumber: formData.phoneNumber,
      placeOrRoom: formData.placeOrRoom,
      dateReported: formData.dateReported,
      dateLost: formData.dateLost,
      status: formData.status,
      notes: formData.notes,
      itemCategory: formData.itemCategory,
      valueEstimate: formData.valueEstimate,
      roomNumber: formData.roomNumber,
    };

    // Save to localStorage
    const lostItems = localStorage.getItem('lostItems');
    let items: LostItem[] = lostItems ? JSON.parse(lostItems) : [];

    if (this.isEditMode && this.editItemId) {
      // Update existing item
      items = items.map((item) =>
        item.id === this.editItemId ? lostItem : item
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Lost item updated successfully',
      });
    } else {
      // Add new item
      items.push(lostItem);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Lost item reported successfully',
      });
    }

    localStorage.setItem('lostItems', JSON.stringify(items));

    // Navigate back to the list
    setTimeout(() => {
      this.router.navigate(['/housekeeping/Lost Items']);
    }, 1500);
  }

  cancelForm() {
    this.router.navigate(['/housekeeping/Lost Items']);
  }

  uuidv4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
