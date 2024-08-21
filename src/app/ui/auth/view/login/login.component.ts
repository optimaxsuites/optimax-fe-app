import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {ErrorStateMatcher} from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthenticationService } from '../../service/authentication.service';
import { RandomTokenService } from 'src/app/ui/shared/service/random-token/random-token.service';
import { v4 as uuidV4 } from 'uuid';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { Message } from 'primeng/api';
import { environment } from 'src/environments/environment.prod';


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
  loginInfo: any = {};
  loginDetails: any = {};
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

  ngOnInit(): void {
    const loginLink = this.navigationLink.getLink('signinLink')
    this.router.navigate([loginLink]);

    if (this.authenticationService.isLoggedIn()) {
      this.authenticationService.logout();
      this.loggedOutMessage1 = 'You have been logged out. Please log in again';
      this.messages = [{ severity: 'info', detail: 'You have been logged out. Please log in again' }];
    }
  }

  async userLoginAction(): Promise<void> {
    this.loading = true;
  
    const loginDetails = {
      username: this.loginInfo.username,
      password: this.loginInfo.password,
      project: `${environment.project}`,
      apiKey: `${environment.apiKey}`
    };
  
    if (!this.loginInfo.username || !this.loginInfo.password) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Username and password are required' });
      this.loading = false;
      return;
    }
  
    try {
      const data = await this.authenticationService.userLogin(loginDetails).toPromise();
      this.loadInitParam(data);
  
      if (!data) {
        this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid username or password. Please check credentials and try again.' });
        this.loggedIn = false;
      } else {
        const registrationComplete = await this.checkUserReg();
        console.log('Registration complete:', registrationComplete); 
  
        if (registrationComplete) {
          const dashboardLink = this.navigationLink.getLink('dashboardLink');
          this.router.navigate([dashboardLink]);
        } else {
          const registrationLink = this.navigationLink.getLink('userRegistrationLink');
          this.router.navigate([registrationLink]);
        }
        this.loggedIn = true;
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 500) {
          this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid username or password. Please check credentials and try again.' });
        } else if (error.status === 404) {
          this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Sign in failed. User is not authenticated.' });
        } else if (error.status === 0) {
          this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'Unable to connect to the server. Please check your internet connection.' });
        }
      } else {
        this.messageService.add({ severity: 'error', summary: 'Unknown Error', detail: 'An unexpected error occurred.' });
      }
      this.loggedIn = false;
    } finally {
      this.loading = false;
    }
  }
  
  checkUserReg(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const userId = sessionStorage.getItem('userid');
      // console.log('Checking registration for userId:', userId); 
  
      if (!userId) {
        resolve(false); 
        return;
      }
  
      this.authenticationService.getUserPrimaryInfoById(userId).subscribe(
        data => {
          sessionStorage["userPrimaryInfoRegData"] = JSON.stringify(data);

          // console.log('User registration data:', data); 
          resolve(!!data && !!data.id); 
        },
        error => {
          // console.error('Error fetching user info:', error); 
          resolve(false); 
        }
      );
    });
  }

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
    sessionStorage.setItem("Token", token);
    localStorage.setItem("Token2", token);
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
        });
  }

}

