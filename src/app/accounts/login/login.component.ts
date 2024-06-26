import { Component } from '@angular/core';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';
import { Router } from '@angular/router';
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
  loginDetails = {
    email: '',
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
    private router: Router
  ){}



  userLoginAction() {
    this.submitted = true;
    this.loading = true;

    // console.log(this.loginDetails)


    if (!this.loginDetails.email || !this.loginDetails.password) {
        this.loading = false;
        // console.log("Here as "+JSON.stringify(this.loginDetails));

        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Email and password are required' });
        // console.log("Email and password are required");
    } else {
        setTimeout(() => {
            this.authenticationService.userLogin(this.loginDetails).subscribe(
                async (data) => {
                    if (!data) {
                        this.messageService.add({ severity: 'error', summary: 'Unsuccessful', detail: 'Invalid login details. Use email.' });
                        this.loggedIn = false;
                        this.loading = false;
                    } else {
                        // // Handle user login data based on client type
                        // if (data.clientType === "INDIVIDUAL") {
                        //     await this.getUserRegInfoData(data);
                        // } else {
                        //     await this.getAdminInfoData(data);
                        // }

                        // Optionally navigate based on roles
                        if (data.roles.includes('admin')) {
                          this.router.navigateByUrl('/dashboard');
                        } 
                    }
                },
                (error) => {
                    if (error.toString() === "403" || error.toString() === "401") {
                        this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid email/password.' });
                        this.loggedIn = false;
                        this.loading = false;
                    } else if (error.toString() === "0") {
                        this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'The server for authentication is unreachable. Check your connection.' });
                        this.loggedIn = false;
                        this.loading = false;
                    }
                }
            );
        }, 2000);
    }
}


// userLoginAction() {
//   this.submitted = true;
//   this.loading = true;

//   if (!this.loginDetails.email || !this.loginDetails.password) {
//       this.loading = false;
//       this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Email and password are required' });
//       return; // Exit early if email or password is missing
//     } else{

//         this.authenticationService.userLogin(this.loginDetails).subscribe(
//             async (data) => {
//                 if (!data) {
//                     this.messageService.add({ severity: 'error', summary: 'Unsuccessful', detail: 'Invalid login details. Please try again.' });
//                     this.loggedIn = false;
//                 } else {
//                     // Optionally navigate based on roles
//                     if (data.roles.includes('admin')) {
//                         this.router.navigateByUrl('/dashboard');
//                         this.loggedIn = true; // Set logged-in state to true
//                     } 
//                     else {
//                         this.messageService.add({ severity: 'error', summary: 'Unauthorized', detail: 'You do not have permission to access this dashboard.' });
//                         this.loggedIn = false;
//                     }
//                 }
//             },
//             (error) => {
//               if (error.status === 400) {
//                   this.messageService.add({ 
//                       severity: 'error', 
//                       summary: 'Bad Request', 
//                       detail: 'The request was invalid. Please check your inputs and try again.' 
//                   });
//               } else if (error.status === 401 || error.status === 403) {
//                   this.messageService.add({ 
//                       severity: 'error', 
//                       summary: 'Authentication Failed', 
//                       detail: 'Invalid email/password. Please try again.' 
//                   });
//               } else if (error.status === 404) {
//                   this.messageService.add({ 
//                       severity: 'error', 
//                       summary: 'Not Found', 
//                       detail: 'The requested resource was not found.' 
//                   });
//               } else if (error.status === 500) {
//                   this.messageService.add({ 
//                       severity: 'error', 
//                       summary: 'Internal Server Error', 
//                       detail: 'Something went wrong on the server. Please try again later.' 
//                   });
//               } else if (error.status === 503) {
//                   this.messageService.add({ 
//                       severity: 'error', 
//                       summary: 'Service Unavailable', 
//                       detail: 'The server is currently unavailable. Please try again later.' 
//                   });
//               } else if (error.status === 0) {
//                   this.messageService.add({ 
//                       severity: 'error', 
//                       summary: 'Server Unreachable', 
//                       detail: 'The server for authentication is unreachable. Check your connection.' 
//                   });
//               } else {
//                   this.messageService.add({ 
//                       severity: 'error', 
//                       summary: 'Error', 
//                       detail: 'An unexpected error occurred. Please try again later.' 
//                   });
//               }
//               this.loggedIn = false;
//           }
          
//         ).add(() => {
//             this.loading = false; // Ensure loading indicator is turned off after API call completes
//         });

//     }

// }



}

