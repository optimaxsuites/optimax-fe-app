import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '../../service/authentication.service';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-verify-token',
  templateUrl: './verify-token.component.html',
  styleUrl: './verify-token.component.scss'
})
export class VerifyTokenComponent implements OnInit {

  token: string | null = null;

  constructor(private route: ActivatedRoute,
     private authenticationService: AuthenticationService,
     private navigationLink: NavigationLinksService,
     private router: Router,
    ) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (this.token) {
      this.verifyUserToken(this.token);
    }
    console.log("my token is here", this.token); // You can use the token here
  }

  verifyUserToken(token: string): void {
    this.authenticationService.userVerification(token).subscribe(
      response => {
        const vrsLink = this.navigationLink.getLink('vrsLink');
        this.router.navigate([vrsLink]);

        console.log("Verification successful", response);
      },
      error => {
        const vrfLink = this.navigationLink.getLink('vrfLink');
        this.router.navigate([vrfLink]);

        console.error("Verification failed", error);
      }
    );
  }

}
