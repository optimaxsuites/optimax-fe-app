import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppHrModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppHrModule, {
  ngZoneEventCoalescing: true
})
  .catch(err => console.error(err));
