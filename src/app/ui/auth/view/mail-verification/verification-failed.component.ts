import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-verification-failed',
  templateUrl: './verification-failed.component.html',
  styleUrls: ['./verification-failed.component.scss', './mail-verification.component.scss']
})
export class VerificationFailedComponent {

  constructor(
    private navigationLink: NavigationLinksService,
    private router: Router,
  ){}

  ngOnInit(): void {
    const vrfLink = this.navigationLink.getLink('vrfLink')
    this.router.navigate([vrfLink]);
  }

}
