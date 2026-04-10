import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private activeTabSubject = new BehaviorSubject<string | null>(null);
  activeTab$ = this.activeTabSubject.asObservable();

  constructor() { }

  navigateToTab(tabName: string) {
    this.activeTabSubject.next(tabName);
  }
}
