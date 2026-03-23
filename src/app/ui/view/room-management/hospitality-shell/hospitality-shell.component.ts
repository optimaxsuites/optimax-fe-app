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
    // Read uuid from current or child route
    this.uuid =
      this.route.snapshot.paramMap.get('uuid') ||
      this.route.firstChild?.snapshot.paramMap.get('uuid') ||
      this.route.parent?.snapshot.paramMap.get('uuid') ||
      localStorage.getItem('tenantId') ||
      'optimax';

    if (this.uuid && this.uuid !== 'default') {
      localStorage.setItem('tenantId', this.uuid);
    }

    // Also listen to router changes for deep linking
    this.router.events.subscribe(() => {
      const newUuid =
        this.route.snapshot.paramMap.get('uuid') ||
        this.route.firstChild?.snapshot.paramMap.get('uuid');
      
      if (newUuid) {
        this.uuid = newUuid;
        if (this.uuid !== 'optimax' && this.uuid !== 'default') {
          localStorage.setItem('tenantId', this.uuid);
        }
      }
      this.updateTabs();
    });

    this.updateTabs();
  }

  updateTabs(): void {
    const uuid = this.uuid;
    // Don't append UUID to routes if it's the default 'optimax' or 'default'
    const routeSuffix = '/' + (uuid || 'optimax');

    this.tabsConfig = [
      {
        name: 'Bookings',
        route: 'bookings' + routeSuffix,
        icon: 'fa-solid fa-calendar-check',
      },
      {
        name: 'Quick Book',
        route: 'bookings/room-select' + routeSuffix,
        icon: 'fa-solid fa-calendar-plus',
      },
      {
        name: 'Rooms',
        route: 'rooms' + routeSuffix,
        icon: 'fa-solid fa-door-open',
      },
      {
        name: 'Services',
        route: 'services' + routeSuffix,
        icon: 'fa-solid fa-concierge-bell',
      },
      {
        name: 'Guests',
        route: 'guests' + routeSuffix,
        icon: 'fa-solid fa-users',
      },
      {
        name: 'Payments',
        route: 'payments' + routeSuffix,
        icon: 'fa-solid fa-credit-card',
      },
      {
        name: 'Housekeeping',
        route: 'housekeeping' + routeSuffix,
        icon: 'fa-solid fa-broom',
      },
      {
        name: 'Settings',
        route: 'settings' + routeSuffix,
        icon: 'fa-solid fa-gear',
      },
    ];
  }

}
