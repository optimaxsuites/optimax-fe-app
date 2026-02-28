import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hospitality-shell',
  templateUrl: './hospitality-shell.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class HospitalityShellComponent {
  navItems = [
    {
      label: 'Room Types',
      route: '/hospitality/room-types',
      icon: 'fa-solid fa-layer-group',
      description: 'Define room categories',
    },
    {
      label: 'Rooms',
      route: '/hospitality/rooms',
      icon: 'fa-solid fa-door-open',
      description: 'Manage physical rooms',
    },
    {
      label: 'Services',
      route: '/hospitality/services',
      icon: 'fa-solid fa-concierge-bell',
      description: 'Add-on services',
    },
    {
      label: 'Service Charges',
      route: '/hospitality/service-charges',
      icon: 'fa-solid fa-receipt',
      description: 'Taxes & fees',
    },
    {
      label: 'Guests',
      route: '/hospitality/guests',
      icon: 'fa-solid fa-users',
      description: 'Manage hotel guests',
    },
    {
      label: 'Bookings',
      route: '/hospitality/bookings',
      icon: 'fa-solid fa-calendar-check',
      description: 'Reservations & check-ins',
    },
    {
      label: 'Payments',
      route: '/hospitality/payments',
      icon: 'fa-solid fa-credit-card',
      description: 'Payment records',
    },
    {
      label: 'Housekeeping',
      route: '/hospitality/housekeeping',
      icon: 'fa-solid fa-broom',
      description: 'Cleaning & maintenance',
    },
  ];

  constructor(private router: Router) {}

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }
}
