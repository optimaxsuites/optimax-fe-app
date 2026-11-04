import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent,
  HttpResponse, HttpErrorResponse
} from '@angular/common/http';
import { from, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment.prod';

declare const window: Window & { __TAURI_INTERNALS__?: unknown };

const isTauri = (): boolean => typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

const DEFAULT_SERVER = 'https://be.optimaxsuites.com';
const COMPILE_TIME_BASE = (environment as any).apiBaseUrl || DEFAULT_SERVER;

function resolveServerBase(): string {
  try {
    const stored = sessionStorage.getItem('serverUrl') || localStorage.getItem('serverUrl');
    if (stored && stored.startsWith('http')) return stored.replace(/\/$/, '');
  } catch { /* ignore */ }
  return COMPILE_TIME_BASE.replace(/\/$/, '');
}

@Injectable()
export class TauriHttpInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!isTauri()) {
      return next.handle(req);
    }

    // Rewrite compile-time base URL to user-configured server URL (for on-prem / custom clouds)
    let url = req.url;
    const configuredBase = resolveServerBase();
    if (configuredBase !== COMPILE_TIME_BASE && url.startsWith(COMPILE_TIME_BASE)) {
      url = configuredBase + url.slice(COMPILE_TIME_BASE.length);
      req = req.clone({ url });
    }

    return from(this.proxyViaRust(req)).pipe(
      catchError(err => throwError(() => new HttpErrorResponse({
        status: 0,
        statusText: 'Tauri IPC error',
        error: err,
        url: req.url,
      })))
    );
  }

  private async proxyViaRust(req: HttpRequest<any>): Promise<HttpEvent<any>> {
    const { invoke } = await import('@tauri-apps/api/core');

    const headers: Record<string, string> = {};
    req.headers.keys().forEach(key => {
      const value = req.headers.get(key);
      if (value) headers[key] = value;
    });

    let body: string | null = null;
    if (req.body !== null && req.body !== undefined) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (!headers['content-type'] && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    const result = await invoke<{ status: number; headers: Record<string, string>; body: string }>(
      'http_proxy',
      { request: { method: req.method, url: req.url, headers, body } }
    );

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(result.body);
    } catch {
      parsedBody = result.body;
    }

    if (result.status >= 400) {
      throw new HttpErrorResponse({
        status: result.status,
        error: parsedBody,
        url: req.url,
      });
    }

    return new HttpResponse({
      status: result.status,
      body: parsedBody,
      url: req.url,
    });
  }
}
