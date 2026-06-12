import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  id?: number;
  severity: 'success' | 'error' | 'info' | 'warn';
  summary?: string;
  detail: string;
  life?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  toasts$ = this.toastSubject.asObservable();

  private toastId = 0;

  show(message: ToastMessage) {
    const id = ++this.toastId;
    this.toastSubject.next({ ...message, id, life: message.life || 5000 });
  }

  success(detail: string, summary: string = 'Success') {
    this.show({ severity: 'success', summary, detail });
  }

  error(detail: string, summary: string = 'Error') {
    this.show({ severity: 'error', summary, detail });
  }

  info(detail: string, summary: string = 'Information') {
    this.show({ severity: 'info', summary, detail });
  }

  warn(detail: string, summary: string = 'Warning') {
    this.show({ severity: 'warn', summary, detail });
  }
}
