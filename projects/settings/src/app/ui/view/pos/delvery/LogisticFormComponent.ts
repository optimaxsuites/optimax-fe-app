import { Component, Output, EventEmitter, Input } from '@angular/core';
import { LogisticsService } from '../../../service/logistics.service';


@Component({
    selector: 'app-logistic-form',
    template: `
    <div class="p-">
      <!-- <h3 class="font-semibold mb-3">Add Logistics Partner</h3>
      <div class="space-y-3">
        <input class="w-full border p-2 rounded" placeholder="Name" [(ngModel)]="payload.name" />
        <input class="w-full border p-2 rounded" placeholder="Contact / Phone" [(ngModel)]="payload.contact" />
        <textarea class="w-full border p-2 rounded" placeholder="Notes" [(ngModel)]="payload.notes"></textarea>

        <div class="flex gap-2 justify-end mt-2">
          <button class="px-3 py-2 bg-customBlue text-white rounded" (click)="save()" [disabled]="loading">
            {{ loading ? 'Saving...' : 'Create' }}
          </button>
        </div>
      </div> -->

      <div class="flex justify-between items-center mb-4 pb-2 border-b">


        <h3 class="text-lg font-medium text-gray-700 ">
        Add New Logistic Partner
      </h3>

      <button class="px-3 py-2 border shadow" (click)="_cancel()">Cancel</button>

      </div>
         

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <!-- Category Name -->
        <div>
          <label for="name" class="block  font-medium text-gray-700 mb-1">
            Logistic Partner Name <span class="text-red-500">*</span>
          </label>
          <input
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-customBlue focus:border-customBlue"
            [(ngModel)]="payload.name" placeholder="Enter partner name" id="name" />
        </div>

        <!-- Category Code -->
        <div>
          <label for="code" class="block  font-medium text-gray-700 mb-1">
            Logistic Partner Code <span class="text-red-500">*</span>
          </label>
          <input
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-customBlue focus:border-customBlue"
            [(ngModel)]="payload.code" placeholder="Enter partner code" id="code" />
        </div>
      </div>

      <!-- Description -->
      <div class="mb-4">
        <label for="description" class="block  font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-customBlue focus:border-customBlue"
          rows="3" [(ngModel)]="payload.description" placeholder="Enter partner's description"
          id="description"></textarea>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end mt-4">
        <!-- <button
          class="px-6 py-2 bg-customBlue text-white rounded-lg hover:bg-customBlue transition flex items-center gap-2"
          (click)="save()">
          <i class="fa-solid fa-plus"></i> Add Logistic
        </button> -->

        <button  class="px-6 py-2 bg-customBlue text-white rounded-lg hover:bg-customBlue transition flex items-center gap-2 " (click)="save()" [disabled]="loading">
            {{ loading ? 'Saving...' : 'Create' }}
          </button>
      </div>
    </div>

    <!-- Categories List -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 py-5 px-4 my-5">
      <h3 class="text-md font-medium text-gray-700 mb-4 pb-2 border-b">
        Existing Logistics Partners
      </h3>

      <div *ngIf="logistics.length === 0" class="text-center py-4 text-gray-500">
        No logistics partner found. Create your first logistic partner above.
      </div>

      <ul *ngIf="logistics.length > 0" class="divide-y divide-gray-200">
        <li *ngFor="let logistic of logistics" class="py-3 flex justify-between items-center">
          <div class="flex items-center">
            <div class="h-8 w-8 bg-customBlue/50 text-customBlue rounded-full flex items-center justify-center mr-3">
              <i class="fa-solid fa-folder"></i>
            </div>
            <span class="font-medium text-gray-700">{{ logistic.name }}</span>
          </div>
          <button class="text-red-500 hover:text-red-700 transition" (click)="removeLogistic(logistic.id)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </li>
      </ul>
    </div>
  `,
    styleUrl: './logistic-form.component.css'
})
export class LogisticFormComponent {
    @Output() created = new EventEmitter<any>();
    @Output() cancel = new EventEmitter<void>();
    @Input() logistics: any[] = [];

    payload: any = { name: '', contact: '', notes: '' };
    loading = false;

    constructor(private logisticsService: LogisticsService) { }

    save() {
        if (!this.payload.name) return;
        this.payload.id = 0
        this.loading = true;
        this.logisticsService.createLogistic(this.payload).subscribe({
            next: (res) => {
                this.loading = false;
                this.created.emit(res);
            },
            error: (err) => {
                console.error('Failed create logistic', err);
                this.loading = false;
            }
        });
    }

    _cancel() {
        this.cancel.emit();
    }

    removeLogistic(id: number) {
        this.logistics = this.logistics.filter(logistic => logistic.id !== id);
        this.logisticsService.deleteLogistic(id).subscribe({
            next: (res) => {
                console.log('Logistic deleted successfully');
            },
            error: (err) => {
                console.error('Failed to delete logistic', err);
            }
        });
    }
}
