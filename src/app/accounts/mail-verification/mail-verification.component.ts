import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthenticationService } from 'src/app/services/authentication/authentication.service';

@Component({
  selector: 'app-mail-verification',
  templateUrl: './mail-verification.component.html',
  styleUrl: './mail-verification.component.scss'
})
export class MailVerificationComponent {

  constructor(private route: ActivatedRoute, private authService: AuthenticationService) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.verifyUser(token);
      }
    });
  }

  verifyUser(token: string): void {
    this.authService.userVerification(token).subscribe(
      response => {
        // Handle the response from the server
        console.log('Verification successful', response);
      },
      error => {
        // Handle any errors from the server
        console.error('Verification failed', error);
      }
    );
  }

}
