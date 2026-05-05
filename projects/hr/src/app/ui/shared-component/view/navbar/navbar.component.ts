import { Component, Output, EventEmitter, Input, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthenticationService } from '../../service/auth-service/authentication.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Input() sidebarHidden!: boolean;

  userInfoRegData: any = {};
  userRegData: any = {};
  private navigationSubscription?: Subscription;

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,

  ){}

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }


  ngOnInit() {
    if (sessionStorage.getItem("username") == null) {
        console.log(
            "Session Expired.",
            "Your current session has expired. Re-login."
        );
        // Navigation removed: app uses async auto-login, session may not be
        // populated yet when navbar renders — navigating here causes a redirect loop.
      return;
    }

    this.refreshUserData();
    this.navigationSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.refreshUserData();
      }
    });

    // console.log("testing client types", this.userInfoRegData);
}

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
  }
  




  logout(): void {
    this.authenticationService.logout();

    // sessionStorage.removeItem("username");
    // sessionStorage.removeItem("token");

    // //added by yomi
    // sessionStorage.removeItem("userInfoRegData");
    // sessionStorage.removeItem("userRegData");
    // sessionStorage.removeItem("accessToken");
    // sessionStorage.removeItem("userid");
    // sessionStorage.removeItem("Token");

    // this.router.navigate([''])
}

  private readUserRegData(): any[] {
    const rawValue = sessionStorage.getItem('userRegData');

    if (!rawValue || rawValue === 'undefined') {
      return [];
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      return [];
    }
  }

  private refreshUserData(): void {
    this.userInfoRegData = this.readUserRegData();
    this.userRegData = this.userInfoRegData && Array.isArray(this.userInfoRegData) && this.userInfoRegData.length > 0
      ? this.userInfoRegData[0]
      : this.userInfoRegData;
  }



}
