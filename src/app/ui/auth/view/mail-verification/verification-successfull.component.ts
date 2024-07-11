import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-verification-successfull',
  templateUrl: './verification-successfull.component.html',
  styleUrls: ['./verification-successfull.component.scss', './mail-verification.component.scss']
})
export class VerificationSuccessfullComponent implements OnInit {

  constructor(
    private navigationLink: NavigationLinksService,
    private router: Router,
  ){}

  ngOnInit(): void {
    const vrsLink = this.navigationLink.getLink('vrsLink')
    this.router.navigate([vrsLink]);
  }
}
