import { Component, Output, EventEmitter, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ImageCacheService } from '../../service/image-cache.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { isSuperUser, getUserPermissionsFor } from '../../../shared/pipes/helper';
// import { NavigationLinksService } from '../../../../sharedComponent/service/navigation-links/navigation-links.service';
// import { PosCheckoutPageComponent } from '../../pos-checkout-page.component';
// import { ImageCacheService } from '../../../../service/image-cache.service';


@Component({
  selector: 'app-checkout-kitchen-header',
  templateUrl: './checkout-header.component.html',
  styleUrl: './checkout-header.component.scss',
  providers: [],
})
export class CheckoutKitchenHeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() closeRegisterEvent = new EventEmitter<void>();
  @Input() closingAmount: number = 0; // Add this property
  @Input() total: number = 0; // Already exists
 @Output() changeMode = new EventEmitter<"waiter" | "chef" | "cashier">();
 @Input() mode: "waiter" | "chef" | "cashier" = "chef";

  userInfoRegData: any[] = [];
  userRegData: any = {};
  logoUrl!: string;
  profileImgUrl!: string;
  showCloseRegisterModal = false;
  showOpeningRegisterModal = true; 
  openingAmount: number = 0; 
  activeMode: "waiter" | "chef" | "cashier" = "waiter";
  orderPermissions = {
  canView: false,
  canEdit: false,
  canDelete: false,
  canCreate: false,
  };

  paymentPermissions = {
  canView: false,
  canEdit: false,
  canDelete: false,
  canCreate: false,
  };


  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService,
    private imageCacheService: ImageCacheService
  ) {  }

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

     if (isSuperUser()) {
          this.orderPermissions = {
            canView: true,
            canEdit: true,
            canDelete: true,
            canCreate: true,
          };
          this.paymentPermissions = {
            canView: true,
            canEdit: true,
            canDelete: true,
            canCreate: true,
          };
        }else {
        this.orderPermissions = getUserPermissionsFor('kitchen_order');
        this.paymentPermissions = getUserPermissionsFor('kitchen_payment');
    
        }

      console.log(Object(this.orderPermissions));
      console.log(Object(this.paymentPermissions)); 
  }


  closeRegister() {
    this.closeRegisterEvent.emit();
    this.showCloseRegisterModal = true;
  }

  setMode(mode: "waiter" | "chef" | "cashier") {
    // this.activeMode = mode;
    this.changeMode.emit(mode);
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  finalizeRegister(data: any): void {
    console.log('Register finalized:', data);
    this.showCloseRegisterModal = false;
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
