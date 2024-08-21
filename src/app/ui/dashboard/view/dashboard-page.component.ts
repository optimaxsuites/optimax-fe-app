import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
  providers: [
    
  ],
})
export class DashboardPageComponent {

  token!: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // this.token = this.route.snapshot.paramMap.get('token')!;
    // console.log('Token:', this.token);
  }
}
