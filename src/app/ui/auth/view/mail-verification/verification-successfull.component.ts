import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-verification-successfull',
  templateUrl: './verification-successfull.component.html',
  styleUrls: ['./verification-successfull.component.scss', './mail-verification.component.scss']
})
export class VerificationSuccessfullComponent implements OnInit {

  countdown: number = 5;

  constructor(
    public navigationLink: NavigationLinksService,
    private router: Router,
  ){}

  ngOnInit(): void {


    const interval = setInterval(() => {
      this.countdown--;

      if (this.countdown === 0) {
        clearInterval(interval);
        const signinLink = this.navigationLink.getLink('signinLink')
        this.router.navigate([signinLink]);
      }
    }, 1000);

    // setTimeout(() => {
    //   const signinLink = this.navigationLink.getLink('signinLink')
    //   this.router.navigate([signinLink]);
    // }, 10000);
    
  }
}
