import { Component } from '@angular/core';

@Component({
  selector: 'app-hikvision-config',
  templateUrl: './hikvision-config.component.html',
  styleUrl: './hikvision-config.component.scss',
})
export class HikvisionConfigComponent {
  readonly callbackUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/hikvision/callback?token=<YOUR_TOKEN>';
  urlCopied = false;

  copyUrl(): void {
    navigator.clipboard.writeText(this.callbackUrl).then(() => {
      this.urlCopied = true;
      setTimeout(() => { this.urlCopied = false; }, 2000);
    }).catch(() => {});
  }
}
