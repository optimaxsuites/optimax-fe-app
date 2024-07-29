import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthenticationService } from '../../service/authentication.service';
import { RandomTokenService } from 'src/app/ui/shared/service/random-token/random-token.service';
import { v4 as uuidV4 } from 'uuid';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { Message } from 'primeng/api';


/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}



@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  providers:[MessageService]

})
export class LoginComponent implements OnInit {

  loading: boolean = false;
  // loginDetails: any = {};
  loginInfo = {
    username: '',
    password: ''
};
  loggedIn: boolean = false;
  submitted: boolean = false;
  loggedOutMessage1?: string;
  messages: Message[] | undefined;

  public token!: string;

 
  hide = true;

  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
  passwordFormControl = new FormControl('', [Validators.required]);

  matcher = new MyErrorStateMatcher();

  constructor(
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private router: Router,
    private navigationLink: NavigationLinksService,
    private route: ActivatedRoute,
    private randomTokenService: RandomTokenService,
  ){}

  // viewDonorProfile: any = []

  ngOnInit(): void {
    // const loginLink = this.navigationLink.getLink('signinLink')
    // this.router.navigate([loginLink]);

    // if (this.authenticationService.isLoggedIn()) {
    //   this.authenticationService.logout();
    //   this.loggedOutMessage1 = 'You have been logged out. Please log in again';
    //   this.messages = [{ severity: 'info', detail: 'You have been logged out. Please log in again' }];
    // }
  }

  



  userLoginAction(){

    // this.submitted = true;
    // this.loading = false;
    // this.loggedIn = true;
    
    const dashboardLink = this.navigationLink.getLink('dashboardLink');
                        this.router.navigate([dashboardLink]);
    console.log("logged in")
  }

// Guarded
  // userLoginAction(): void {
  //   this.submitted = true;
  //   this.loading = true;
  //   this.loggedIn = false;

 


  //   if (!this.loginInfo.username || !this.loginInfo.password) {
  //       this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Username and password are required' });
  //       this.loading = false;
  //   } else {
  //       setTimeout(() => {
  //           this.authenticationService.userLogin(this.loginInfo).subscribe(
  //             async (data) => {
  //               this.loadInitParam(data);
  //                   if (!data) {
  //                       this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid username or password. Please check credentials and try again.' });
  //                       this.loggedIn = false;
  //                       this.loading = false;
  //                   } else {
  //                     if (!data.needsRegistration) {
  //                       const registrationLink = this.navigationLink.getLink('userRegistrationLink');
  //                       this.router.navigate([registrationLink]);
  //                     } else {
  //                       const dashboardLink = this.navigationLink.getLink('dashboardLink');
  //                       this.router.navigate([dashboardLink]);
  //                     }
  //                     this.loggedIn = true;
  //                     this.loading = false;
  //                   }
  //               },
  //               (error) => {
  //                 if (error.toString() == "500") {
  //                     this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid username or password. Please check credentials and try again.' });
  //                     this.loggedIn = false;
  //                     this.loading = false;
  //                   } 
  //                   if (error.toString() == "404") {
  //                     this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Sign in failed. User is not authenticated.' });
  //                     this.loggedIn = false;
  //                     this.loading = false;
  //                   }
  //                   else if (error.toString() == "0") {
  //                       this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'Unable to connect to the server. Please check your internet connection.' });
  //                       this.loggedIn = false;
  //                       this.loading = false;
  //                   }
  //                   this.loading = false;
  //               }
  //           );
  //       }, 2000);

  //   }
  // }

  navigateToSignup(){
    const signupLink = this.navigationLink.getLink('signupLink');
    this.router.navigate([signupLink]);
    console.log()
  }




  loadInitParam(data: any) {
    sessionStorage.setItem("username", data.username);
    sessionStorage.setItem("userid", data.id);
    const tokenStartIndex = data.accessToken.indexOf('=') + 1;
    const token = data.accessToken.substring(tokenStartIndex, data.accessToken.indexOf(';'));
    sessionStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("accessToken2", data.accessToken);
    sessionStorage["userRegData"] = JSON.stringify(data);
  }


  async getUserRegInfoData(data: any) {
    this.authenticationService
        .getRegDataByUsername(data.username)
        .subscribe((p) => {
            console.log("second login method result", data);
            console.log(p[1].user.roles);

            if (p) {
                sessionStorage["userInfoRegData"] = JSON.stringify(p);
            }
            this.router.navigate(["dashboard"]);
        });
  }




}

