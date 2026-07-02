import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'estimatedDelivery' })
export class EstimatedDeliveryPipe implements PipeTransform {
  transform(value: number | string | null | undefined, unit: 'days' | 'hours' | 'minutes' = 'days'): string {
    const v = Number(value);
    if (isNaN(v) || value == null) return '';

    switch (unit) {
      case 'hours': {
        if (v <= 0) return '0 min';
        if (v < 1) return `${Math.round(v * 60)} min`;
        const rounded = Math.round(v);
        return `${rounded} hr${rounded > 1 ? 's' : ''}`;
      }
      case 'minutes': {
        if (v <= 0) return '0 min';
        if (v < 60) return `${Math.round(v)} min`;
        if (v < 24 * 60) {
          const hrs = Math.round(v / 60);
          return `${hrs} hr${hrs > 1 ? 's' : ''}`;
        }
        const days = Math.round(v / (24 * 60));
        return `${days} day${days > 1 ? 's' : ''}`;
      }
      case 'days':
      default: {
        if (v <= 0) return '0 day';
        if (v < 1) {
          // show hours if fractional day
          const hours = Math.round(v * 24);
          if (hours < 1) return `${Math.round(v * 24 * 60)} min`;
          return `${hours} hr${hours > 1 ? 's' : ''}`;
        }
        const rounded = Math.round(v);
        return `${rounded} day${rounded > 1 ? 's' : ''}`;
      }
    }
  }
}