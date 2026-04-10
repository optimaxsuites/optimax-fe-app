import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppSettingsModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppSettingsModule)
  .catch(err => console.error(err));
