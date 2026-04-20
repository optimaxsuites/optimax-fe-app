import { Injectable } from '@angular/core';
import {
  HttpContextToken,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ToastService } from '../../../../services/toast.service';
import { ErrorMessageService } from './error-message.service';

export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

@Injectable()
export class ErrorToastInterceptor implements HttpInterceptor {
  constructor(
    private toastService: ToastService,
    private errorMessageService: ErrorMessageService
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: unknown) => {
        if (!req.context.get(SUPPRESS_ERROR_TOAST)) {
          const detail = this.errorMessageService.getUserMessage(
            error,
            'Something went wrong. Please try again.'
          );

          this.toastService.error(detail);
        }

        return throwError(() => error);
      })
    );
  }
}
