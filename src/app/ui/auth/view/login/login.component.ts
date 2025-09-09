import { ChangeDetectionStrategy, Component, HostListener, OnInit, signal } from '@angular/core';
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
import { hasOnlyCheckoutPermission, hasOnlyKitchenPermissions, isSuperUser } from 'projects/POS/src/app/shared/pipes/helper';


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
  providers:[MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,

})
export class LoginComponent implements OnInit {

  loading: boolean = false;
  loginInfo: any = {};
  loginDetails: any = {};
  loggedIn: boolean = false;
  submitted: boolean = false;
  loggedOutMessage1?: string;
  messages: Message[] | undefined;
  posCode: string = '';
  pinDots: number[] = [1, 2, 3, 4];
  
  // New state variable to toggle between login modes
  isCodeLogin: boolean = false;
  
  // New variable to store the POS code entered via numpad
  posCodeDisplay: string = '';

  public token!: string;
  hide = signal(true);
  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }


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
    if (this.authenticationService.isLoggedIn()) {
      this.authenticationService.logout();
      this.loggedOutMessage1 = 'You have been logged out. Please log in again';
      this.messages = [{ severity: 'info', detail: 'You have been logged out. Please log in again' }];
    }
  }

  // Method to toggle the login mode
  toggleLoginMode(): void {
    this.isCodeLogin = !this.isCodeLogin;
    // Clear the form fields when toggling modes
    this.loginInfo = {};
    this.posCodeDisplay = '';
  }
  
 
async posLoginAction(): Promise<void> {
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

  // if (!data) {
  // this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid username or password. Please check credentials and try again.' });
  // this.loggedIn = false;
  // } else {
  // // const registrationComplete = await this.checkUserReg();
  // // console.log('Registration complete:', registrationComplete)
  // const dashboardLink = this.navigationLink.getLink('dashboardLink');
  //  this.router.navigate([dashboardLink]);


  // // if (registrationComplete) {
  // //  console.log('routing...')
  // //  const dashboardLink = this.navigationLink.getLink('dashboardLink');
  // //  console.log(dashboardLink)


  // //  this.router.navigate([dashboardLink]);
  // // } else {
  // //  const registrationLink = this.navigationLink.getLink('userRegistrationLink');
  // //  this.router.navigate([registrationLink]);
  // // }
  // this.loggedIn = true;
  // }
 } catch (error) {
  this.handleLoginError(error);
  this.loggedIn = false;
 } finally {
  this.loading = false;
 }
 }

  async userLoginAction(): Promise<void> {
    this.loading = true;

    // Check which login mode is active and call the appropriate function
    if (this.isCodeLogin) {
      await this.passwordLoginAction();

    } else {
      await this.posLoginAction();

    }
  }

  async passwordLoginAction(): Promise<void> {

    this.loading = true;

    const loginDetails = {
      eCode: this.posCode,
      apiKey: `${environment.apiKey}`
    };

    try {
      const data = await this.authenticationService.userWithLogin(loginDetails).toPromise();
      this.handleCodeLoginResponse(data);
      this.loading = false;

    } catch (error) {
      this.handleLoginError(error);
      this.loading = false;
      this.posCode = '';
      this.loggedIn = false;

    } 
   
  }


  async handleLoginResponse(data: any): Promise<void> {
    if (!data) {
      this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid credentials. Please check and try again.' });
      this.loggedIn = false;
    } else {
      this.loadInitParam(data);
      
      this.loggedIn = true;
    }
  }

   async handleCodeLoginResponse(data: any): Promise<void> {
    if (!data) {
      this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid credentials. Please check and try again.' });
      this.loggedIn = false;
    } else {
      this.loadInitParam(data);
      this.loggedIn = true;
    }
  }


  handleLoginError(error: any): void {
   
    if (error) {
      if (error === '500') {
        this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid credentials. Please check and try again.' });
      }
      else if (error === '404') {
        this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Sign in failed. User is not authenticated.' });
      } else if (error === '0') {
        this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'Unable to connect to the server. Please check your internet connection.' });
      }
      else if (error === '400') {
        this.messageService.add({ severity: 'error', summary: 'Invalid credentials', detail: 'The credentials provided are invalid.' });
      }
    } else {
      this.messageService.add({ severity: 'error', summary: 'Unknown Error', detail: 'An unexpected error occurred.' });
    }
    this.loggedIn = false;
  }
  
  checkUserReg(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const userId = sessionStorage.getItem('userid');
      if (!userId) {
        resolve(false);
        return;
      }

      this.authenticationService.getUserPrimaryInfoById(userId).subscribe(
        data => {
          sessionStorage["userPrimaryInfoRegData"] = JSON.stringify(data);
          resolve(!!data && !!data.id);
        },
        error => {
          resolve(false);
        }
      );
    });
  }

  navigateToSignup(){
    const signupLink = this.navigationLink.getLink('signupLink');
    this.router.navigate([signupLink]);
  }

  loadInitParam(data: any) {

   
    sessionStorage.setItem("role", data.roles)
    sessionStorage.setItem("username", data.username);
    sessionStorage.setItem("fullname", data.fullname);
    sessionStorage.setItem("email", data.email);
    sessionStorage.setItem("userid", data.id);
    const tokenStartIndex = data.accessToken.indexOf('=') + 1;
    const token = data.accessToken.substring(tokenStartIndex, data.accessToken.indexOf(';'));
    sessionStorage.setItem("Token", token);
    localStorage.setItem("Token2", token);
    sessionStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("accessToken2", data.accessToken);
    sessionStorage["userRegData"] = JSON.stringify(data);

    this.checkUserReg();


     if(isSuperUser()){
        const dashboardLink = this.navigationLink.getLink('dashboardLink');
        this.router.navigate([dashboardLink]);
        return;
      }

     this.authenticationService.getUserApplicationRole(data.id).subscribe({
      next: (response) => {
        console.log("User application role:", response);
        // sessionStorage.setItem("userApplicationRole", JSON.stringify(response));
        if (Array.isArray(data.roles) && data.roles.includes("ROLE_ADMIN")) {
        console.log("Super user detected");
        sessionStorage.setItem(
          "userApplicationRole",
          JSON.stringify(response)
        );
      } else {
        sessionStorage.setItem(
          "userApplicationRole",
          JSON.stringify(response)
        );
      }

      // console.log(hasOnlyCheckoutPermission())
      // console.log((hasOnlyKitchenPermissions()))

     
      if (hasOnlyCheckoutPermission()) {
        const checkoutLink = this.navigationLink.getLink('checkoutLink');
        this.router.navigate([checkoutLink]); 
      } else if (hasOnlyKitchenPermissions()){
        const kitchenLink = this.navigationLink.getLink('kitchenLink');
        this.router.navigate([kitchenLink]);
      }
       else {
        const dashboardLink = this.navigationLink.getLink('dashboardLink');
        this.router.navigate([dashboardLink]);
      }
      },
      error: (error) => {
        console.error("Error fetching user application role:", error);
         const storedRole = sessionStorage.getItem("userApplicationRole");
          if (storedRole) {
            console.log("Removing invalid userApplicationRole from sessionStorage");
            sessionStorage.removeItem("userApplicationRole");
          }
      }
    })

     
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


  onNumpadClick(value: string) {
  if (value === 'clear') {
    this.posCode = '';
  } else if (value === 'delete') {
    this.posCode = this.posCode.slice(0, -1);
  } else if (this.posCode.length < this.pinDots.length) {
    this.posCode += value;
  }

  if (this.posCode.length === 4) {
    this.loading = true;

      // setTimeout(() => {
        // this.loginInfo.username = this.posCode; 
        this.passwordLoginAction();

      // }, 300);
    }

}

// userWithCodeLogin(){

// }

@HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if(this.isCodeLogin){
    if (/^\d$/.test(event.key)) {
      this.onNumpadClick(event.key);
    } else if (event.key === 'Backspace') {
      this.onNumpadClick('delete');
    } else if (event.key.toLowerCase() === 'c') {
      this.onNumpadClick('clear');
    }
    }
   
  }

}
