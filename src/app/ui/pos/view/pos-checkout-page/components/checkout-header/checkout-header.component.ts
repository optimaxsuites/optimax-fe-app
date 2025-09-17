import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { PosCheckoutPageComponent } from '../../pos-checkout-page.component';

@Component({
  selector: 'app-checkout-header',
  templateUrl: './checkout-header.component.html',
  styleUrl: './checkout-header.component.scss',
  providers: [PosCheckoutPageComponent]

})
export class CheckoutHeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() closeRegisterEvent = new EventEmitter<void>();


  userInfoRegData: any[] = [];
  userRegData: any = { };

  

  constructor(
    private router: Router,
   public navigationLink: NavigationLinksService, public posCheckoutPageComponent: PosCheckoutPageComponent 
  ){}


  closeRegister() {
    this.closeRegisterEvent.emit();
  
  }
 
  onToggleSidebar() {
    this.toggleSidebar.emit();
  }


  ngOnInit() {
    // if (sessionStorage.getItem("username") == null) {
    //     console.log(
    //         "Session Expired.",
    //         "Your current session has expired. Re-login."
    //     );
    //     this.router.navigate([""]);
    // }

    this.userInfoRegData = JSON.parse(sessionStorage["userRegData"]);
    this.userRegData = this.userInfoRegData;

    console.log("testing client types", this.userInfoRegData);
}
  




  logout(): void {
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("token");

    //added by yomi
    sessionStorage.removeItem("userInfoRegData");
    sessionStorage.removeItem("userRegData");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("userid");
    this.router.navigate([''])
}

}
