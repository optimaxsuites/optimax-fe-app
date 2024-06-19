import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '../../services/authentication/authentication.service';


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
  styleUrls: ['./register.component.scss']
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
    private toastr: ToastrService,
    private authenticationService: AuthenticationService
  ) {}


  userForm: FormGroup = new FormGroup({
    // id: new FormControl('0'),
    // firstName: new FormControl(''),
    username: new FormControl(''),
    email: new FormControl(''),
    password: new FormControl(''),
    rewritePassword: new FormControl('')
  })

  createUser(): void{

    const { username, email, password, password2 } = this.registerInfo;


    if (password !== password2) {
      this.toastr.error('Passwords do not match', 'Error');
      // this.loading = false;
      return;
    }

    if (!username || !email || !password || !password2) {
      this.toastr.error('All fields are required', 'Error');
      // this.loading = false;
      return;
    }else {
      this.loading = true;

      this.signupDetails.username = this.registerInfo.username;
      this.signupDetails.password = this.registerInfo.password;
      this.signupDetails.email = this.registerInfo.email;
      this.signupDetails.role = ["admin"];
    }

    // const signupDetails = {
    //   username,
    //   email,
    //   password
    // };

      // this.loading = true;


    this.authenticationService.userRegistration(this.signupDetails).subscribe(
      data => {
        this.toastr.success('User registered successfully!', 'Success');
        this.loading = false;
        // Handle successful registration (e.g., redirect to login)
      },
      error => {
        this.toastr.error('Registration failed', 'Error');
        this.loading = false;
      }
    );
  }

}


