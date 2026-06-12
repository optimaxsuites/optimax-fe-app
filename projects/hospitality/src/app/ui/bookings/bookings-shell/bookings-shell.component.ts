import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HotelserviceService } from '../../hospitality/hotelservice.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { AppConstants } from '../../../shared/constants/app.constants';

@Component({
  selector: 'app-bookings-shell',
  templateUrl: './bookings-shell.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class BookingsShellComponent implements OnInit, OnDestroy {
  uuid = '';
  isMenuOpen = false;
  isUserMenuOpen = false;
  branding: any = {
    companyName: 'OptimaxHospitality',
    logo: null,
    logoPosition: 'left'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelserviceService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.uuid = this.getDeepParam(this.route.snapshot, 'uuid') || '';
        this.logger.debug('UUID resolved', { uuid: this.uuid });
      });
    this.loadBranding();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    const saved = localStorage.getItem(AppConstants.STORAGE_BRANDING);
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
