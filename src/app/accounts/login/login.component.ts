import { Component } from '@angular/core';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthenticationService } from 'src/app/services/authentication/authentication.service';


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
export class LoginComponent {

  loading: boolean = false;
  // loginDetails: any = {};
  loginInfo = {
    username: '',
    password: ''
};
  loggedIn: boolean = false;
  submitted: boolean = false;

 
  hide = true;

  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
  passwordFormControl = new FormControl('', [Validators.required]);

  matcher = new MyErrorStateMatcher();

  constructor(
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
  ){}




  // works without gaurd and interceptor
  // userLoginAction() {
  //   this.submitted = true;

  //   // Check if username and password are filled
  //   if (!this.loginInfo.email || !this.loginInfo.password) {
  //       this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Username and password are required' });
  //       console.log("Username and password are required");
  //       return;
  //   }

  //   this.loading = true;

  //   const loginDetails = {
  //       username: this.loginInfo.email,
  //       password: this.loginInfo.password,
  //   };

  //   this.authenticationService.userLogin(loginDetails).subscribe(
  //       (data) => {

  //         this.loading = false;
  //         this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Login successful!', life: 2000 });
  //         // Optionally, redirect to another page after successful login
  //         this.router.navigateByUrl('/dashboard');
  //       },
  //       (error) => {
  //         if (error.toString() == "500") {
  //           this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid username or password. Please check credentials and try again.' });
  //           this.loggedIn = false;
  //           this.loading = false;
  //         } else if (error.toString() == "0") {
  //             this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'Unable to connect to the server. Please check your internet connection.' });
  //             this.loggedIn = false;
  //             this.loading = false;
  //         }
  //         this.loading = false;
  //       }
        
  //     );
  // }








// Guarded
userLoginAction(): void {
  this.submitted = true;
  this.loading = true;
  this.loggedIn = false;


  if (!this.loginInfo.username || !this.loginInfo.password) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Username and password are required' });
      this.loading = false;
  } else {
      setTimeout(() => {
          this.authenticationService.userLogin(this.loginInfo).subscribe(
            (data) => {
                  if (!data) {
                      this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid username or password. Please check credentials and try again.' });
                      this.loggedIn = false;
                      this.loading = false;
                  } else {
                    this.loadInitParam(data);

                      // console.log("greate", data);
                      // if (data.roles === "ROLE_ADMIN") {
                          // await this.getUserRegInfoData(data);
                          this.router.navigate(["dashboard"]);
                          this.loggedIn = true;
                          this.loading = false;
                          console.log('login successfull')
                      // }
                  }
              },
              (error) => {
                if (error.toString() == "500") {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid username or password. Please check credentials and try again.' });
                    this.loggedIn = false;
                    this.loading = false;
                  } 
                  if (error.toString() == "404") {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Sign in failed. User is not authenticated.' });
                    this.loggedIn = false;
                    this.loading = false;
                  }
                  else if (error.toString() == "0") {
                      this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'Unable to connect to the server. Please check your internet connection.' });
                      this.loggedIn = false;
                      this.loading = false;
                  }
                  this.loading = false;
              }
          );
      }, 2000);

  }
}



loadInitParam(data: any) {
  sessionStorage.setItem("username", data.username);
  sessionStorage.setItem("userid", data.id);
  // const tokenStartIndex = data.accessToken.indexOf('=') + 1;
  // const token = data.accessToken.substring(tokenStartIndex, data.accessToken.indexOf(';'));
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

