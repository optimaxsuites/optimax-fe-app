import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Amenity {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-booking-amenities',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <h2 class="text-2xl font-bold text-gray-900">What this room offers</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
        <div
          *ngFor="let amenity of amenities"
          class="flex items-center space-x-4 text-gray-700"
        >
          <div class="w-6 h-6 text-emerald-600">
            <svg
              [ngSwitch]="amenity.icon"
              class="w-full h-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                *ngSwitchCase="'wifi'"
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.336c5.857-5.857 15.355-5.857 21.212 0"
              />
              <path
                *ngSwitchCase="'climate'"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
              <path
                *ngSwitchCase="'tv'"
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
              />
              <path
                *ngSwitchCase="'coffee'"
                d="M18 8g1.3 0 2.4.6 3 1.7.3.7.1 1.4-.4 1.8l-.2.1c-.5.3-1.2.3-1.7.1L19 13M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"
              />
              <path *ngSwitchDefault d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span class="text-[17px] font-medium">{{ amenity.label }}</span>
        </div>
      </div>
      <button
        class="px-8 py-3 border border-gray-900 rounded-2xl font-bold text-gray-900 hover:bg-gray-50 transition-colors mt-4"
      >
        Show all 24 amenities
      </button>
    </div>
  `,
})
export class BookingAmenitiesComponent {
  @Input() amenities: Amenity[] = [];
}
