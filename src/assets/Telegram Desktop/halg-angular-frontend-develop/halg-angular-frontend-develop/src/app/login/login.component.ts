import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {ButtonModule} from 'primeng/button';
import { UserData } from '../administration/domain/users.data';
import { UserAuthenticationService } from '../administration/service/user.authentication.service';
import {MessageService} from 'primeng/api';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-user-login',
  templateUrl: './login.component.html',
  providers: [MessageService],

})
export class UserLoginComponent implements OnInit {
  error: any;
  headers: string[];
  loggedIn: boolean = false;
  loading = false;

  userdata: UserData = {
    username: '',
    password: '',
    loginstatus:false,
    userid: 0,
     user_type_id: 0, 
     created_date: 0,
     created_by: 0,
     fingerprintclient: '',
     fingerprintmatcher: '',
     usersinformation: null
  }
  _userdata: any;


  constructor(private messageService: MessageService, private authservice: UserAuthenticationService, private route: ActivatedRoute,
    private router: Router ) { }

  ngOnInit(): void {

  }
  userLogin(): void {
  this.loading = true;
  setTimeout(() => 
  {
    this.userLoginAction();
    this.loading = false
  },2000) 
   
  }
  userLoginAction(): void {
   
    this.loading = true;
    setTimeout(() => {
    this.authservice.userLogin(this.userdata)
    .subscribe(
    data => {
      if(!data){
        this.addError("Authentication Failed.","Invalid username/password");
        this.loggedIn = false;
        this.loading = false;
      }
      if(!data.user.loginstatus){
        this.addError("Authentication Failed.","You are not authorized to use the application.");
        this.router.navigate(['']);
        this.loggedIn = false;
        this.loading = false;

      }
      else{
      this.loadInitParam(data);
      this.router.navigate(['dashboard']);
      this.loggedIn = true;
      this.loading = false;
     
      }
 
    },
    error => {
      if(error.toString() == '403'){
      this.addError("Authentication Failed.","Invalid username/password...");
      this.loggedIn = false;
      this.loading = false;
    }
    else if(error.toString() == '0'){
      this.addError("Server Unreachable.","The server for authentication is unreachable. Check your connection.");
      this.loggedIn = false;
      this.loading = false;
    }
    }
    )
  
  }, 2000)
   
  }



  addSuccess(title:string,message:string) {
    this.messageService.add({sticky: true,severity:'success', summary:title, detail:message});
  }
  addError(title:string,message:string) {
    this.messageService.add({sticky: true,severity:'error', summary:title, detail:message});
  }
  pp: any;

  loadInitParam(data){
      sessionStorage.setItem('username', data.user.username);
      sessionStorage.setItem('userid', data.user.userid);
      sessionStorage.setItem('token',data.token);
      sessionStorage.setItem('userinformation',JSON.stringify(data.user.usersinformation));
      localStorage.setItem('token2',data.token);
      sessionStorage['userinformation'] = JSON.stringify(data.user.usersinformation);
      sessionStorage.setItem('apiBaseUrl',`${environment.apiBaseUrl}`)



  }

}

