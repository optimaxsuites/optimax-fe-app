import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bookings-shell',
  templateUrl: './bookings-shell.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class BookingsShellComponent implements OnInit {
  uuid = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Read uuid from the route parameter
    this.route.paramMap.subscribe(params => {
      this.uuid = params.get('uuid') || '';
    });
  }
}
