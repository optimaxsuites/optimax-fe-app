import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HotelserviceService } from '../../hospitality/hotelservice.service';

@Component({
  selector: 'app-bookings-shell',
  templateUrl: './bookings-shell.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class BookingsShellComponent implements OnInit {
  uuid = '';
  isMenuOpen = false;
  isUserMenuOpen = false;
  branding: any = {
    companyName: 'OptimaxHospitality',
    logo: null,
    logoPosition: 'left'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelserviceService
  ) {}

  ngOnInit(): void {
    // Read uuid from the current or child route parameter
    this.route.paramMap.subscribe(params => {
      this.uuid = this.getDeepParam(this.route.snapshot, 'uuid') || '';
      console.log('BookingsShell Resolved UUID:', this.uuid);
    });
    this.loadBranding();
  }

  private getDeepParam(snapshot: any, param: string): string | null {
    if (snapshot.paramMap.has(param)) {
      return snapshot.paramMap.get(param);
    }
    for (const child of snapshot.children) {
      const res = this.getDeepParam(child, param);
      if (res) return res;
    }
    return null;
  }

  private loadBranding(): void {
    const saved = localStorage.getItem('optimax_settings');
    if (saved) {
      this.branding = JSON.parse(saved);
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  getCompanyNamePart1(): string {
    return this.branding.companyName.split('Hospitality')[0];
  }
}
