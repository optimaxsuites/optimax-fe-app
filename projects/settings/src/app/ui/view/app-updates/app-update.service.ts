import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { environment } from '../../sharedComponents/service/environments/environment.prod';

declare const window: Window & { __TAURI_INTERNALS__?: unknown };

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'up-to-date'
  | 'error';

export interface UpdateInfo {
  version: string;
  notes?: string;
  date?: string;
}

@Injectable({ providedIn: 'root' })
export class AppUpdateService implements OnDestroy {
  readonly isDesktop = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
  readonly currentVersion: string = environment.appVersion ?? '—';

  readonly status$ = new BehaviorSubject<UpdateStatus>('idle');
  readonly downloadProgress$ = new BehaviorSubject<number>(0);
  readonly updateInfo$ = new BehaviorSubject<UpdateInfo | null>(null);
  readonly errorMessage$ = new BehaviorSubject<string>('');
  readonly webUpdateReady$ = new BehaviorSubject<boolean>(false);

  private destroy$ = new Subject<void>();
  private tauriUpdate: any = null;

  constructor(private swUpdate: SwUpdate, private zone: NgZone) {
    if (!this.isDesktop && swUpdate.isEnabled) {
      swUpdate.versionUpdates
        .pipe(
          filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.zone.run(() => {
            this.webUpdateReady$.next(true);
            this.status$.next('ready');
            this.updateInfo$.next({
              version: 'New version available',
              notes: 'Reload the app to apply the latest update.',
            });
          });
        });
    }
  }

  async checkForUpdate(): Promise<void> {
    this.status$.next('checking');
    this.errorMessage$.next('');
    this.tauriUpdate = null;

    try {
      if (this.isDesktop) {
        await this.checkTauri();
      } else {
        await this.checkWeb();
      }
    } catch (err: any) {
      this.status$.next('error');
      this.errorMessage$.next(err?.message ?? 'Update check failed.');
    }
  }

  private async checkTauri(): Promise<void> {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) {
      this.status$.next('up-to-date');
      return;
    }
    this.tauriUpdate = update;
    this.updateInfo$.next({
      version: update.version,
      notes: update.body ?? undefined,
      date: update.date ?? undefined,
    });
    this.status$.next('ready');
  }

  private async checkWeb(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      this.status$.next('up-to-date');
      return;
    }
    const updateFound = await this.swUpdate.checkForUpdate();
    if (!updateFound && !this.webUpdateReady$.value) {
      this.status$.next('up-to-date');
    }
  }

  async applyUpdate(): Promise<void> {
    if (this.isDesktop) {
      await this.installTauri();
    } else {
      await this.reloadWeb();
    }
  }

  private async installTauri(): Promise<void> {
    if (!this.tauriUpdate) return;
    this.status$.next('downloading');
    this.downloadProgress$.next(0);

    let downloaded = 0;
    let total = 0;
    await this.tauriUpdate.downloadAndInstall((event: any) => {
      switch (event.event) {
        case 'Started':
          total = event.data.contentLength ?? 0;
          break;
        case 'Progress':
          downloaded += event.data.chunkLength ?? 0;
          if (total > 0) {
            this.zone.run(() =>
              this.downloadProgress$.next(Math.round((downloaded / total) * 100))
            );
          }
          break;
        case 'Finished':
          this.zone.run(() => this.downloadProgress$.next(100));
          break;
      }
    });

    // App will relaunch automatically after install on desktop
  }

  private async reloadWeb(): Promise<void> {
    await this.swUpdate.activateUpdate();
    window.location.reload();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
