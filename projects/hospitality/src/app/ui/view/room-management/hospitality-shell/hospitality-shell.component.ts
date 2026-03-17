import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavTabComponent } from '../../../sharedComponent/view/nav-tab/nav-tab.component';
import { TabConfig } from '../../../sharedComponent/service/interface/data';

@Component({
  selector: 'app-hospitality-shell',
  templateUrl: './hospitality-shell.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, NavTabComponent],
})
export class HospitalityShellComponent implements OnInit {
  uuid = '';
  tabsConfig: TabConfig[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Read uuid from parent route since we are now a child route 'hospitality/:uuid'
    this.uuid =
      this.route.snapshot.paramMap.get('uuid') ||
      this.route.parent?.snapshot.paramMap.get('uuid') ||
      '';

    this.tabsConfig = [
      {
        name: 'Bookings',
        route: 'bookings',
        icon: 'fa-solid fa-calendar-check',
      },
      {
        name: 'Rooms',
        route: 'rooms',
        icon: 'fa-solid fa-door-open',
      },
      {
        name: 'Services',
        route: 'services',
        icon: 'fa-solid fa-concierge-bell',
      },
      {
        name: 'Guests',
        route: 'guests',
        icon: 'fa-solid fa-users',
      },
      {
        name: 'Payments',
        route: 'payments',
        icon: 'fa-solid fa-credit-card',
      },
      {
        name: 'Housekeeping',
        route: 'housekeeping',
        icon: 'fa-solid fa-broom',
      },
      {
        name: 'Settings',
        route: 'settings',
        icon: 'fa-solid fa-gear',
      },
    ];
  }

}
