import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(400px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class ToastContainerComponent implements OnInit {
  toasts: Toast[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.getToasts().subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }

  getIcon(type: string): string {
    const icons: { [key: string]: string } = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };
    return icons[type] || 'ℹ';
  }
}
