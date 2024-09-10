import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
})
export class DashboardPageComponent {

  token!: string;
  


  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {

    const fullname = sessionStorage.getItem('fullname')

  }
}
