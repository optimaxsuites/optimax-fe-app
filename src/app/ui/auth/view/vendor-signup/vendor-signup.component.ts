import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../../service/authentication.service';
import { environment } from 'src/environments/environment.prod';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const pw2 = group.get('confirmPassword')?.value;
  return pw && pw2 && pw !== pw2 ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-vendor-signup',
  templateUrl: './vendor-signup.component.html',
  styleUrls: ['./vendor-signup.component.scss']
})
export class VendorSignupComponent implements OnInit {

  form!: FormGroup;
  loading = false;
  submitted = false;
  errorMsg = '';
  successMsg = '';
  hidePassword = true;
  hideConfirm = true;

  // BODMAS captcha
  captchaQuestion = '';
  captchaAnswer = 0;
  private captchaA = 0;
  private captchaB = 0;
  private captchaOp: '+' | '×' = '+';

  private uuid = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthenticationService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || '';
    this.form = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      captchaInput: ['', Validators.required]
    }, { validators: passwordMatchValidator });

    this.generateCaptcha();
  }

  generateCaptcha(): void {
    this.captchaA = Math.floor(Math.random() * 9) + 1;
    this.captchaB = Math.floor(Math.random() * 9) + 1;
    this.captchaOp = Math.random() > 0.5 ? '+' : '×';
    this.captchaAnswer = this.captchaOp === '+' ? this.captchaA + this.captchaB : this.captchaA * this.captchaB;
    this.captchaQuestion = `What is ${this.captchaA} ${this.captchaOp} ${this.captchaB}?`;
    this.form.get('captchaInput')?.setValue('');
  }

  get f() { return this.form.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.errorMsg = '';

    if (this.form.invalid) return;

    const captchaVal = Number(this.form.get('captchaInput')?.value);
    if (captchaVal !== this.captchaAnswer) {
      this.errorMsg = 'Incorrect answer. Please try again.';
      this.generateCaptcha();
      return;
    }

    this.loading = true;
    const { companyName, username, email, password } = this.form.value;

    const signupPayload = {
      username,
      email,
      password,
      role: ['VENDOR'],
      project: environment.project || 'ERP',
      apiKey: environment.apiKey || ''
    };

    this.authService.userRegistration(signupPayload).subscribe({
      next: (res: any) => {
        const userId = res?.id || res?.userId || null;
        const preRegPayload = { userAccountId: userId, companyName, email };
        const baseUrl = (environment as any).apiBaseUrl;
        this.http.post(`${baseUrl}/x/api/v2/commerce/vendors/pre-register`, preRegPayload, {
          headers: { 'X-Tenant-ID': this.uuid || 'optimax' }
        }).subscribe({
          next: () => {
            this.loading = false;
            this.successMsg = 'Account created! Please check your email to verify your address.';
          },
          error: () => {
            // User was created; vendor record failed — non-fatal, still inform user
            this.loading = false;
            this.successMsg = 'Account created! Please check your email to verify your address.';
          }
        });
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.message || 'Registration failed. The username or email may already be in use.';
        this.generateCaptcha();
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/user/auth', this.uuid]);
  }
}
