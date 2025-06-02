import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  isMobileMenuOpen = false;
  isDarkMode = false;

  constructor() {
    this.isDarkMode =
      localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    this.updateTheme();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this.updateTheme();

    // Save preference to localStorage
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  private updateTheme(): void {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    // Close mobile menu when screen size changes to desktop
    if (event.target.innerWidth >= 768) {
      this.isMobileMenuOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close mobile menu when clicking outside of it
    const target = event.target as HTMLElement;
    const navbar = target.closest('nav');

    if (!navbar && this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }
}
