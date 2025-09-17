import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppPOSModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppPOSModule)
  .catch(err => console.error(err));
