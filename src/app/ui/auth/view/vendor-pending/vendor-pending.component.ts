import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthenticationService } from '../../service/authentication.service';

@Component({
  selector: 'app-vendor-pending',
  templateUrl: './vendor-pending.component.html',
  styleUrls: ['./vendor-pending.component.scss']
})
export class VendorPendingComponent {

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthenticationService
  ) {}

  logout(): void {
    this.authService.logout();
  }
}
