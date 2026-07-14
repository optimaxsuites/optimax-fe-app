import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MenuItem } from '../../domain/menuItem.dto';
import { NavigationEnd, Router } from '@angular/router';
import { NavigationLinksService } from '../../service/navigation-links/navigation-links.service';
import { MenuItemsService } from 'projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service';
import { CompanyProfileService } from 'projects/settings/src/app/ui/sharedComponents/service/company-profile/company-profile.service';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';

// Matches a trailing UUID v4 segment so we can compare paths without UUIDs
const UUID_RE = /\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Component({
  selector: 'app-sidebar2',
  templateUrl: './sidebar2.component.html',
  styleUrl: './sidebar2.component.scss'
})
export class Sidebar2Component implements OnInit, OnDestroy {
  @Input() sidebarHidden!: boolean;
  @Output() toggleSidebar = new EventEmitter<void>();
  showAdminUI = false;
  menuItems!: Observable<MenuItem[]>;
  filteredMenuItems$!: Observable<MenuItem[]>;
  searchQuery$ = new BehaviorSubject<string>('');
  companyProfile$ = this.companyProfileService.companyProfile$;
  role: string | null = null;

  private subs = new Subscription();
  private currentPath = '';
  private openStates = new Map<string, boolean>();
marketplace : any =   {
  label: 'Marketplace',
  route: this.navigationLink.getLink('marketplaceLink'),
  roles: ['ROLE_USER', 'ROLE_ADMIN'],
  icon: 'fas fa-store'
}

tenant: any = {
  label: 'Tenants',
  route: this.navigationLink.getLink('tenantLink'),
  roles: ['ROLE_USER', 'ROLE_ADMIN'],
  icon: 'fa-solid fa-people-arrows'
}
  constructor(private menuService: MenuItemsService,  private router: Router, private navigationLink: NavigationLinksService, private companyProfileService: CompanyProfileService) {}

  ngOnInit(): void {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    this.showAdminUI = subdomain === 'optimax' || subdomain === 'localhost';

    const token = sessionStorage.getItem('Token');
    if (token) {
      this.menuService.getRegisterApps();
    }

    this.menuItems = this.menuService.getMenuItems$();
    this.currentPath = this.stripUuid(this.router.url.split('?')[0]);

    this.filteredMenuItems$ = combineLatest([this.menuItems, this.searchQuery$]).pipe(
      map(([items, query]) => {
        // Restore open state based on current path every time items are re-emitted
        this.applyOpenState(items);
        if (!query.trim()) return items;
        const q = query.toLowerCase();
        return items.reduce<MenuItem[]>((acc, item) => {
          const labelMatch = item.label?.toLowerCase().includes(q);
          if (item.submenu) {
            const matchedSubs = item.submenu.filter((s: any) => !s.isSectionHeader && s.label?.toLowerCase().includes(q));
            if (labelMatch || matchedSubs.length) {
              acc.push({ ...item, submenu: matchedSubs.length ? matchedSubs : item.submenu, open: true });
            }
          } else if (labelMatch) {
            acc.push(item);
          }
          return acc;
        }, []);
      })
    );

    this.subs.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
        this.currentPath = this.stripUuid((e.urlAfterRedirects || e.url).split('?')[0]);
        this.updateActiveState();
      })
    );
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); this.openStates.clear(); }

  private stripUuid(url: string): string {
    return url.replace(UUID_RE, '');
  }

  isSubItemActive(route: string | undefined): boolean {
    if (!route) return false;
    const routePath = this.stripUuid(route);
    return !!routePath && this.currentPath.startsWith(routePath);
  }

  private applyOpenState(items: MenuItem[]): void {
    items.forEach(item => {
      if (item.submenu) {
        const key = item.code ?? item.label ?? '';
        const activeByRoute = item.submenu.some(sub => this.isSubItemActive(sub.route));
        if (activeByRoute) {
          item.open = true;
          this.openStates.set(key, true);
        } else {
          item.open = this.openStates.get(key) ?? false;
        }
      }
    });
  }

  updateActiveState(): void {
    this.menuItems.pipe(
      filter(items => !!items?.length),
    ).subscribe(items => {
      this.applyOpenState(items);
    }).unsubscribe();
  }

  toggleSubMenu(item: MenuItem, allItems?: MenuItem[]): void {
    if (item.submenu) {
      const willOpen = !item.open;
      const items = allItems ?? [];
      items.forEach(menuItem => {
        if (menuItem.submenu) {
          menuItem.open = false;
          this.openStates.set(menuItem.code ?? menuItem.label ?? '', false);
        }
      });
      item.open = willOpen;
      this.openStates.set(item.code ?? item.label ?? '', willOpen);
    }
  }
  onSearch(value: string): void {
    this.searchQuery$.next(value);
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  onNavigate(): void {
    if (
      !this.sidebarHidden &&
      typeof window !== 'undefined' &&
      window.innerWidth <= 992
    ) {
      this.toggleSidebar.emit();
    }
  }

  get sidebarClass() {
    return this.sidebarHidden ? 'collapsed' : 'expanded';
  }

  isSuperUser(): boolean {
  const roles = sessionStorage.getItem("role");
  return roles?.includes("ROLE_ADMIN") ?? false;
}
  
}
