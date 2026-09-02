import { Component, Input, Type, ChangeDetectionStrategy, OnInit, ChangeDetectorRef } from '@angular/core';
import { DropdownOption, TabConfig } from '../../service/interface/data';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-tab',
  templateUrl: './nav-tab.component.html',
  styleUrl: './nav-tab.component.scss',
  // NOTE: OnPush was removed. This component hosts arbitrary tab content via
  // *ngComponentOutlet (e.g. every Leave tab). Each outletted component
  // manages its own async state (HTTP calls, isLoading flags, etc.) and
  // relies on normal change detection to reflect that state in the DOM.
  // With OnPush here, Angular only re-checks this view (and everything
  // inside the ngComponentOutlet) when one of THIS component's own inputs
  // changes or cdr.markForCheck() is called explicitly — neither of which
  // happens when a child component like LeaveRequestComponent finishes an
  // async load. The result: component state updates correctly in memory
  // (isLoading becomes false, data populates) but the view never
  // re-renders, leaving the UI stuck on a stale "loading" state forever
  // even though nothing is actually broken in the child component.
  // standalone: true,
  // imports: [CommonModule],
})
export class NavTabComponent implements OnInit {
  @Input() tabsConfig: TabConfig[] = [];

  isDropdownOpen = false;
  isMobileMenuOpen = false;
  selectedTab: string = '';
  selectedSetting: string | null = null;
  selectedDropdownTab: string = '';
  user_role: any = '';
  #sessionStorageCacheKey = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.user_role = sessionStorage.getItem('role');
    this.#sessionStorageCacheKey = this.tabsConfig
      .map((tab) => tab.name)
      .join('-')
      .toLowerCase()
      .trim();
    const accessibleTab = this.tabsConfig.find(
      (tab) => !tab.role || tab.role === this.user_role
    );
    this.selectedTab = accessibleTab
      ? accessibleTab.name
      : this.tabsConfig[0]?.name;

    const cachedTabName = sessionStorage.getItem(this.#sessionStorageCacheKey);
    const isCachedTabAccessible = this.tabsConfig.some(
      (tab) => tab.name === cachedTabName && (!tab.role || tab.role === this.user_role)
    );

    if (cachedTabName && isCachedTabAccessible) {
      this.selectedTab = cachedTabName;
      return;
    }

    this.#cacheSelectedTab(this.selectedTab);
  }

  toggleDropdown(tabName: string) {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  selectTab(tab: any) {
    this.isMobileMenuOpen = false;
    if (tab.hasDropdown) {
      this.toggleDropdown(tab.name);
      this.selectedDropdownTab = tab.name;
    } else {
      this.selectedTab = tab.name;
      this.#cacheSelectedTab(tab.name);
      this.isDropdownOpen = false;
      this.cdr.markForCheck();
    }
  }

  selectDropdownOption(tabName: string, option: DropdownOption) {
    this.selectedTab = tabName;
    this.#cacheSelectedTab(tabName);
    this.selectedSetting = option.action;
    this.isDropdownOpen = false;
    this.cdr.markForCheck();
  }
  getComponentForOption(action: string): Type<any> | null {
    const tab = this.tabsConfig.find((t) =>
      t.dropdownOptions?.some((opt) => opt.action === action)
    );
    return (
      tab?.dropdownOptions?.find((opt) => opt.action === action)?.component ||
      null
    );
  }

  getSelectedTab() {
    return this.tabsConfig.find((tab) => tab.name === this.selectedTab);
  }

  #cacheSelectedTab(tabName: string) {
    sessionStorage.setItem(this.#sessionStorageCacheKey, tabName);
  }
}