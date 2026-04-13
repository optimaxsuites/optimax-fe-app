import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-booking-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <div
        class="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-200"
      >
        <div class="grid grid-cols-2 divide-x divide-gray-200">
          <div class="p-4 space-y-1">
            <label
              class="text-[10px] font-bold uppercase tracking-widest text-gray-400"
              >Check-in</label
            >
            <div class="text-[15px] font-bold">Oct 24, 2023</div>
          </div>
          <div class="p-4 space-y-1">
            <label
              class="text-[10px] font-bold uppercase tracking-widest text-gray-400"
              >Check-out</label
            >
            <div class="text-[15px] font-bold">Oct 27, 2023</div>
          </div>
        </div>
        <div class="p-4 space-y-1">
          <label
            class="text-[10px] font-bold uppercase tracking-widest text-gray-400"
            >Guests</label
          >
          <div class="text-[15px] font-bold">2 Adults, 1 Child</div>
        </div>
      </div>

      <div class="space-y-4 pt-4 text-[15px]">
        <div class="flex justify-between text-gray-600">
          <span>₦{{ price | number }} x 3 nights</span>
          <span class="font-bold text-gray-900">₦{{ price * 3 | number }}</span>
        </div>
        <div class="flex justify-between text-gray-600">
          <span>Service charge</span>
          <span class="font-bold text-gray-900">₦12,500</span>
        </div>
        <div class="flex justify-between text-gray-600">
          <span>Taxes</span>
          <span class="font-bold text-gray-900">₦18,750</span>
        </div>
        <div class="border-t border-gray-200 pt-4 flex justify-between">
          <span class="font-bold text-gray-900">Total</span>
          <span class="text-xl font-bold text-gray-900"
            >₦{{ price * 3 + 12500 + 18750 | number }}</span
          >
        </div>
      </div>

      <button
        class="w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-bold text-white transition-colors text-lg"
      >
        Confirm Booking
      </button>
    </div>
  `,
})
export class BookingDetailsComponent {
  @Input() price: number = 0;
}
