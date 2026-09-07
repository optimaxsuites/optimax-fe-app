import { Component, HostListener } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

// damilola worked on this: main application shell loading state and responsive sidebar behavior.
@Component({
  selector: 'app-master',
  templateUrl: './master.component.html',
  styleUrls: ['./master.component.scss']
})
export class MasterComponent {
  sidebarHidden: boolean = true;
  currentYear?: number;
  isLoading = false;

  ngOnInit(): void {
    this.currentYear = new Date().getFullYear();
  }

  constructor(private router: Router) {
    this.checkScreenWidth();
    console.log('[master] init — innerWidth:', window.innerWidth, 'sidebarHidden:', this.sidebarHidden);
       this.router.events.subscribe((event) => {
          if (event instanceof NavigationStart) {
            this.isLoading = true;
            console.log('[master] NavigationStart →', (event as any).url);
          }
          if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
            this.isLoading = false;
            console.log('[master] NavigationEnd/Cancel/Error — isLoading=false, url:', (event as any).url || (event as any).urlAfterRedirects);
            if (this.isMobileViewport()) {
              this.sidebarHidden = true;
              console.log('[master] mobile viewport detected — sidebarHidden=true');
            }
          }
        });
  }

  // Detect window resize to adjust sidebar visibility based on screen size
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenWidth();
  }

  // Function to check screen size and adjust sidebar visibility
  checkScreenWidth() {
    if (window.innerWidth <= 992) {
      this.sidebarHidden = true;  // Hide sidebar by default on small screens
    } else {
      this.sidebarHidden = false;  // Show sidebar on large screens
    }
  }

  isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 992;
  }

  toggleSidebar() {
    this.sidebarHidden = !this.sidebarHidden;  // Toggle sidebar visibility
  }

  // toggleSidebar() {
  //   this.sidebarHidden = !this.sidebarHidden;
  // }

}
