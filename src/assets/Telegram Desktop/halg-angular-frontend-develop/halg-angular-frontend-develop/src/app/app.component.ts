import { Component } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'halg-kp-front';

  topbarTheme = 'light';

  menuTheme = 'dim';

  layoutMode = 'light';

  menuMode = 'horizontal';

  isRTL = false;

  inputStyle = 'outlined';

  ripple: boolean;

  constructor(private primengConfig: PrimeNGConfig) {}

  ngOnInit() {
      this.primengConfig.ripple = true;
  }

}
