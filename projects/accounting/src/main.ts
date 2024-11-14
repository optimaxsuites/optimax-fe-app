import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppAccountingModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppAccountingModule)
  .catch(err => console.error(err));
