import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppDashboardModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppDashboardModule)
  .catch(err => console.error(err));
