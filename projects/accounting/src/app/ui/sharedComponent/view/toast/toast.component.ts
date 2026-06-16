import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastMessage, ToastService } from '../../../../services/toast.service';
import { Subscription, timer } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

interface ActiveToast extends ToastMessage {
  visible: boolean;
}

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  animations: [
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(100%)' }),
          stagger(100, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true }),
        query(':leave', [
          animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))
        ], { optional: true })
      ])
    ])
  ]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ActiveToast[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.toastService.toasts$.subscribe(toast => {
        const activeToast: ActiveToast = { ...toast, visible: true };
        this.toasts.push(activeToast);
        
        if (activeToast.life) {
          timer(activeToast.life).subscribe(() => {
            this.remove(activeToast);
          });
        }
      })
    );
  }

  remove(toast: ActiveToast): void {
    this.toasts = this.toasts.filter(t => t.id !== toast.id);
  }

  trackByToast(index: number, toast: ActiveToast): number | undefined {
    return toast.id;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getSeverityClasses(severity: string): string {
    switch (severity) {
      case 'success':
        return 'bg-emerald-50 border-emerald-500 text-emerald-800';
      case 'error':
        return 'bg-rose-50 border-rose-500 text-rose-800';
      case 'warn':
        return 'bg-amber-50 border-amber-500 text-amber-800';
      case 'info':
        return 'bg-sky-50 border-sky-500 text-sky-800';
      default:
        return 'bg-gray-50 border-gray-500 text-gray-800';
    }
  }

  getIcon(severity: string): string {
    switch (severity) {
      case 'success': return 'pi pi-check-circle';
      case 'error':   return 'pi pi-exclamation-circle';
      case 'warn':    return 'pi pi-exclamation-triangle';
      case 'info':    return 'pi pi-info-circle';
      default:        return 'pi pi-bell';
    }
  }
}
