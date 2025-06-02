import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppExpensesModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppExpensesModule)
  .catch(err => console.error(err));
