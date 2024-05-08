import { Component } from '@angular/core';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';


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

})
export class LoginComponent {
  hide = true;

  emailFormControl = new FormControl('', [Validators.required, Validators.email]);

  emailMatcher = new MyErrorStateMatcher();

  passwordFormControl = new FormControl('', [Validators.required]);

  passwordMatcher = new MyErrorStateMatcher();

}

export class signIn{
  email: string;
  password: string;

  constructor() {
    this.email = '';
    this.password = '';
  }

}
