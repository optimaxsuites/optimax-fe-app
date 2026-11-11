import { Pipe, PipeTransform } from '@angular/core';

const BACKEND = 'https://be.optimaxsuites.com';
const PROXY = 'http://127.0.0.1:9877';

function isTauri(): boolean {
  return typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
}

@Pipe({ name: 'tauriImg' })
export class TauriImgPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    if (!url || !isTauri()) return url || '';
    if (url.startsWith(BACKEND)) return PROXY + url.slice(BACKEND.length);
    return url;
  }
}
