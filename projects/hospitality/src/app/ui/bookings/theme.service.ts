import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ThemeService implements OnDestroy {
  private darkMode = new BehaviorSubject<boolean>(false);
  isDarkMode$ = this.darkMode.asObservable();
  private prefersDarkQuery: MediaQueryList;

  constructor() {
    this.prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.prefersDarkQuery.addEventListener(
      'change',
      this.handleSystemThemeChange
    );

    this.initializeTheme();
  }

  ngOnDestroy(): void {
    this.prefersDarkQuery.removeEventListener(
      'change',
      this.handleSystemThemeChange
    );
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = this.prefersDarkQuery.matches;

    if (savedTheme) {
      this.setDarkMode(savedTheme === 'dark');
    } else {
      this.setDarkMode(systemPrefersDark);
    }
  }

  private handleSystemThemeChange = (event: MediaQueryListEvent): void => {
    if (!localStorage.getItem('theme')) {
      this.setDarkMode(event.matches);
    }
  };

  toggleTheme(): void {
    const newMode = !this.darkMode.value;
    this.darkMode.next(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    this.updateThemeClass();
  }

  private setDarkMode(isDark: boolean): void {
    this.darkMode.next(isDark);
    this.updateThemeClass();
  }

  private updateThemeClass(): void {
    if (this.darkMode.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
