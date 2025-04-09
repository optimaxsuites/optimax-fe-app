import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../../../../sharedComponent/service/navigation-links/navigation-links.service';
import { PosCheckoutPageComponent } from '../../pos-checkout-page.component';
import { ImageCacheService } from '../../../../service/image-cache.service';

@Component({
  selector: 'app-checkout-header',
  templateUrl: './checkout-header.component.html',
  styleUrl: './checkout-header.component.scss',
  providers: [],
})
export class CheckoutHeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() closeRegisterEvent = new EventEmitter<void>();

  userInfoRegData: any[] = [];
  userRegData: any = {};
  logoUrl!: string;
  profileImgUrl!: string;

  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService,
    public posCheckoutPageComponent: PosCheckoutPageComponent,
    private imageCacheService: ImageCacheService
  ) {}

  closeRegister() {
    this.closeRegisterEvent.emit();
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  ngOnInit() {
    this.imageCacheService
      .getImageAsync('/assets/Logo-green.png')
      .then((val) => (this.logoUrl = val));
    this.imageCacheService
      .getImageAsync('/assets/profile.jpg')
      .then((val) => (this.profileImgUrl = val));

    // if (sessionStorage.getItem("username") == null) {
    //     console.log(
    //         "Session Expired.",
    //         "Your current session has expired. Re-login."
    //     );
    //     this.router.navigate([""]);
    // }

    this.userInfoRegData = JSON.parse(sessionStorage['userRegData']);
    this.userRegData = this.userInfoRegData;

    console.log('testing client types', this.userInfoRegData);
  }

  logout(): void {
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('token');

    //added by yomi
    sessionStorage.removeItem('userInfoRegData');
    sessionStorage.removeItem('userRegData');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('userid');
    this.router.navigate(['']);
  }
}
