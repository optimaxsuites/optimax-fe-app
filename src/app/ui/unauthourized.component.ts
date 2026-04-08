import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { NavigationLinksService } from './shared/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-unauthourized',
  templateUrl: './unauthourized.component.html',
  styleUrl: './unauthourized.component.scss'
})
export class UnauthourizedComponent {
 constructor(private router: Router, private navigationLink: NavigationLinksService) {}

  goBack() {
      this.router.lastSuccessfulNavigation?.previousNavigation?.finalUrl
    ? this.router.navigateByUrl(this.router.lastSuccessfulNavigation.previousNavigation.finalUrl.toString())
    : this.router.navigate([this.navigationLink.getLink('dashboardLink')]);
  }
}
