import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-booking-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-4xl font-bold text-gray-900 tracking-tight">
          {{ roomName }}
        </h1>
        <div class="flex space-x-3">
          <button
            class="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
          <button
            class="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>
      </div>
      <div class="flex items-center space-x-4 text-sm">
        <div class="flex items-center text-amber-500 font-bold">
          ★ {{ rating }}
          <span class="text-gray-400 font-normal ml-1"
            >({{ reviews }} Reviews)</span
          >
        </div>
        <span class="text-gray-300">•</span>
        <div class="flex items-center text-gray-500">
          <svg
            class="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
          </svg>
          {{ location }}
        </div>
      </div>
    </div>

    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-gray-900">Description</h2>
      <p class="text-gray-600 leading-relaxed text-lg">{{ description }}</p>
    </div>
  `,
})
export class BookingOverviewComponent {
  @Input() roomName: string = '';
  @Input() location: string = '';
  @Input() rating: number = 0;
  @Input() reviews: number = 0;
  @Input() description: string = '';
}
