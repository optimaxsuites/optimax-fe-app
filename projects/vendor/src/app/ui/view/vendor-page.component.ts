import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-vendor-page',
  templateUrl: './vendor-page.component.html',
  styleUrl: './vendor-page.component.scss'
})
export class VendorPageComponent implements OnInit {
  constructor(private router: Router, private navigationLink: NavigationLinksService) {}

  ngOnInit(): void {
    this.router.navigate([this.navigationLink.getLink('VPLink')]);
  }
}
