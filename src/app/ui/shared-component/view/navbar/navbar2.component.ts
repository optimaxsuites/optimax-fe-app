// Removed duplicate import
import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../service/auth-service/authentication.service';

@Component({
  selector: 'app-navbar2',
  templateUrl: './navbar2.component.html',
  styleUrls: ['./navbar2.component.scss', './navbar.component.scss']
})
export class Navbar2Component {
  isDashboardMenuOpen = false;

  @Output() dashboardSwitch = new EventEmitter<'advance' | 'cooperative'>();

  toggleDashboardMenu(event: Event): void {
    event.stopPropagation();
    this.isDashboardMenuOpen = !this.isDashboardMenuOpen;
  }

  switchDashboard(value: 'advance' | 'cooperative'): void {
    this.isDashboardMenuOpen = false;
    this.dashboardSwitch.emit(value);
  }

  // constructor(
  //   public navbar: NavbarComponent,
  // ){

  // }

  @Output() toggleSidebar = new EventEmitter<void>();

  userInfoRegData: any = {};
  userRegData: any = {};
  

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

    this.userInfoRegData = this.readUserRegData();
    this.userRegData = this.userInfoRegData && Array.isArray(this.userInfoRegData) && this.userInfoRegData.length > 0 ? this.userInfoRegData[0] : this.userInfoRegData;

    console.log("testing client types", this.userInfoRegData);
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




}
