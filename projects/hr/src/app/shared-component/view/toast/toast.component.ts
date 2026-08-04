import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../service/toast/toast.service';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  standalone: true,
  imports: [CommonModule]
})
export class ToastComponent implements OnInit {
  private toastService = inject(ToastService);
  toasts: Toast[] = [];

  ngOnInit() {
    this.toastService.toasts.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  removeToast(id: string) {
    this.toastService.remove(id);
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      'success': 'fa-solid fa-circle-check',
      'error': 'fa-solid fa-circle-xmark',
      'warning': 'fa-solid fa-triangle-exclamation',
      'info': 'fa-solid fa-circle-info'
    };
    return icons[type] || 'fa-solid fa-info-circle';
  }
}
