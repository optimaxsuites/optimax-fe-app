import { platformBrowser } from '@angular/platform-browser';
import { AppAccountingModule } from './app/app.module';

platformBrowser().bootstrapModule(AppAccountingModule, {
  ngZoneEventCoalescing: true,
})
  .catch(err => console.error(err));
