import { Component, OnInit } from '@angular/core';
import {AppComponent} from './app.component';
import {AppMainComponent} from './app.main.component';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-topbar',
  templateUrl: './app.topbar.component.html'
})

export class AppTopBarComponent {

  constructor(private router: Router,public appMain: AppMainComponent, public app: AppComponent) { }
userinformation: any;
  ngOnInit() {
    if(sessionStorage.getItem('username') == null){
      console.log("Session Expired.","Your current session has expired. Re-login.");
        this.router.navigate(['']);
      }
      
    this.userinformation = JSON.parse(sessionStorage['userinformation']);
  }
  
  logout(): void{
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('token');
    this.router.navigate(['']);
  }
}
