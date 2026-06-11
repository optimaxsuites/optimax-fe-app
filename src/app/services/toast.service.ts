import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  private autoCloseTimeout: { [key: string]: any } = {};

  getToasts(): Observable<Toast[]> {
    return this.toasts$.asObservable();
  }

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 4000): void {
    const id = 'toast-' + Date.now() + Math.random();
    const toast: Toast = { id, message, type, duration };

    const current = this.toasts$.value;
    this.toasts$.next([...current, toast]);

    if (duration > 0) {
      this.autoCloseTimeout[id] = setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  remove(id: string): void {
    if (this.autoCloseTimeout[id]) {
      clearTimeout(this.autoCloseTimeout[id]);
      delete this.autoCloseTimeout[id];
    }
    const current = this.toasts$.value;
    this.toasts$.next(current.filter(t => t.id !== id));
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }
}
