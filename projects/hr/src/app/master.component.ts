import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-master',
  templateUrl: './master.component.html',
  styleUrls: ['./master.component.scss']
})
export class MasterComponent {
  sidebarHidden: boolean = true;
  currentYear?: number;

  ngOnInit(): void {
    this.currentYear = new Date().getFullYear();
  }

  constructor() {
    this.checkScreenWidth();
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

  toggleSidebar() {
    this.sidebarHidden = !this.sidebarHidden;  // Toggle sidebar visibility
  }

  // toggleSidebar() {
  //   this.sidebarHidden = !this.sidebarHidden;
  // }

}
