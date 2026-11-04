import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppUpdateService, UpdateInfo, UpdateStatus } from './app-update.service';

@Component({
  selector: 'app-app-updates',
  templateUrl: './app-updates.component.html',
  styleUrls: ['./app-updates.component.scss'],
})
export class AppUpdatesComponent implements OnInit, OnDestroy {
  status: UpdateStatus = 'idle';
  downloadProgress = 0;
  updateInfo: UpdateInfo | null = null;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(readonly updateService: AppUpdateService) {}

  ngOnInit(): void {
    this.updateService.status$.pipe(takeUntil(this.destroy$))
      .subscribe(s => (this.status = s));
    this.updateService.downloadProgress$.pipe(takeUntil(this.destroy$))
      .subscribe(p => (this.downloadProgress = p));
    this.updateService.updateInfo$.pipe(takeUntil(this.destroy$))
      .subscribe(i => (this.updateInfo = i));
    this.updateService.errorMessage$.pipe(takeUntil(this.destroy$))
      .subscribe(e => (this.errorMessage = e));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  check(): void {
    this.updateService.checkForUpdate();
  }

  apply(): void {
    this.updateService.applyUpdate();
  }

  get platformLabel(): string {
    if (this.updateService.isDesktop) {
      const ua = navigator.userAgent;
      if (ua.includes('Win')) return 'Windows';
      if (ua.includes('Mac')) return 'macOS';
      return 'Linux';
    }
    return 'Web';
  }

  get platformIcon(): string {
    if (this.updateService.isDesktop) {
      const ua = navigator.userAgent;
      if (ua.includes('Win')) return 'fab fa-windows';
      if (ua.includes('Mac')) return 'fab fa-apple';
      return 'fab fa-linux';
    }
    return 'fas fa-globe';
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }
}
