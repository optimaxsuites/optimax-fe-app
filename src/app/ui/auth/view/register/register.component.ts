import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';
import { MessageService } from 'primeng/api';
import { Route, Router } from '@angular/router';
import { AuthenticationService } from '../../service/authentication.service';




/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  providers: [MessageService]
})
export class RegisterComponent {

  registerInfo: any = {};
  signupDetails: any = {};
  hide = true;
  submitted = false;
  loading: boolean = false;



  // fnFormControl = new FormControl('', [Validators.required]);
  usernameFormControl = new FormControl('', [Validators.required]);
  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
  passwordFormControl = new FormControl('', [Validators.required]);
  rewritePasswordFormControl = new FormControl('', [Validators.required]);

  matcher = new MyErrorStateMatcher();

  constructor(
    // private toastr: ToastrService,
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private router: Router
  ) {}


  userForm: FormGroup = new FormGroup({
    // id: new FormControl('0'),
    // firstName: new FormControl(''),
    username: new FormControl(''),
    email: new FormControl(''),
    password: new FormControl(''),
    rewritePassword: new FormControl('')
  })

  // createUser(): void{

  //   const { username, email, password, password2 } = this.registerInfo;


  //   if (password !== password2) {
  //     this.toastr.error('Passwords do not match', 'Error');
  //     // this.loading = false;
  //     return;
  //   }

  //   if (!username || !email || !password || !password2) {
  //     this.toastr.error('All fields are required', 'Error');
  //     // this.loading = false;
  //     return;
  //   }else {
  //     this.loading = true;

  //     this.signupDetails.username = this.registerInfo.username;
  //     this.signupDetails.password = this.registerInfo.password;
  //     this.signupDetails.email = this.registerInfo.email;
  //     this.signupDetails.role = ["admin"];
  //   }

  //   // const signupDetails = {
  //   //   username,
  //   //   email,
  //   //   password
  //   // };

  //     // this.loading = true;


  //   this.authenticationService.userRegistration(this.signupDetails).subscribe(
  //     data => {
  //       this.toastr.success('User registered successfully!', 'Success');
  //       this.loading = false;
  //       // Handle successful registration (e.g., redirect to login)
  //     },
  //     error => {
  //       this.toastr.error('Registration failed', 'Error');
  //       this.loading = false;
  //     }
  //   );
  // }

  // createUser() {
  //   this.submitted = true;

  //   if (this.registerInfo.password !== this.registerInfo.rewritepassword) {
  //     this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Passwords do not match' });
  //     // this.toastr.error('Passwords do not match', 'Error');
  //   console.log("password dont match");

  //     return;
  //   } 
  //   else if (!this.registerInfo.username || !!this.registerInfo.email || !!this.registerInfo.password || !!this.registerInfo.password2) {
  //     this.messageService.add({ severity: 'error', summary: 'Error', detail: 'All fields are required' });
  //     // this.toastr.error('All fields are required', 'Error');
  //   console.log("all field required");
  //     // this.loading = false;
  //     return;
  //   } 

  //   this.loading = true;

  //   const signupDetails = {
  //     username: this.registerInfo.username,
  //     password: this.registerInfo.password,
  //     email: this.registerInfo.email,
  //     role: ['admin']
  //   };
  //   // console.log("Here as "+JSON.stringify(signupDetails));
  //   this.authenticationService.userRegistration(signupDetails).subscribe(
      
  //     (data) => {
  //       this.loading = false;
  //       this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User registered successfully!' });
  //       // this.toastr.success('User registered successfully!', 'Success');/
  //       // Optionally, redirect to another page after successful registration
  //       // this.router.navigateByUrl('/login');
  //     },
  //     (error) => {
  //       // this.toastr.error('Registration failed', 'Error');
  //       this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Registration failed' });
  //       console.log("reg failed");

  //       this.loading = false;
  //     }
  //   );
  // }

  createUser() {
    this.submitted = true;

    // Check if passwords match
    if (this.registerInfo.password !== this.registerInfo.rewritepassword) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Passwords do not match' });
        console.log("Passwords do not match");
        return;
    }

    // Check if all fields are filled
    if (!this.registerInfo.username || !this.registerInfo.email || !this.registerInfo.password || !this.registerInfo.rewritepassword) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'All fields are required' });
        console.log("All fields are required");
        return;
    }

    this.loading = true;

    const signupDetails = {
        username: this.registerInfo.username,
        password: this.registerInfo.password,
        email: this.registerInfo.email,
        role: ['admin']
    };

    this.authenticationService.userRegistration(signupDetails).subscribe(
      async (data) => {
            this.loading = false;
            // this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User registered successfully!' });
            // Optionally, redirect to another page after successful registration
            this.router.navigateByUrl('/email-verification');
        },
        (error) => {

          if (error.toString() == '400') {
            // Client-side validation error (invalid input)
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Registration Failed', 
                detail: 'Your account have not been verified. Check your mail to verify!' 
            });
        } else if (error.toString() == '409') {
            // Conflict error (e.g., email already registered)
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Registration Failed', 
                detail: 'Email address is already registered. Please use a different email or login.' 
            });
        } else if (error.toString() == '0') {
            // Network error or server unreachable
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Registration Failed', 
                detail: 'Unable to connect to the server. Please check your internet connection.' 
            });
        } else {
            // Other server errors
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Registration Failed', 
                detail: 'An unexpected error occurred. Please try again later.' 
            });
        }


            // this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Registration failed' });
            // console.log("Registration failed");
            this.loading = false;
        }
    );
}


}


