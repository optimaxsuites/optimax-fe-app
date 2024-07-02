import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  userInfoRegData: any[] = [];
  userRegData: any = {};

  constructor(
    private router: Router
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
        this.router.navigate([""]);
    }

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
