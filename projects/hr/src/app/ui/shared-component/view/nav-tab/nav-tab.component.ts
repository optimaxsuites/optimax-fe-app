import { Component, Input, Type } from '@angular/core';
import { DropdownOption, TabConfig } from '../../service/interface/data';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-tab',
  templateUrl: './nav-tab.component.html',
  styleUrl: './nav-tab.component.scss',
  // standalone: true,
  // imports: [CommonModule],
})
export class NavTabComponent {
  @Input() tabsConfig: TabConfig[] = [];

  isDropdownOpen = false;
  selectedTab: string = '';
  selectedSetting: string | null = null;
  selectedDropdownTab: string = '';
  user_role: any = '';
  #sessionStorageCacheKey = '';

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

  selectTab(tab: any) {
    if (tab.hasDropdown) {
      this.toggleDropdown(tab.name);
      this.selectedDropdownTab = tab.name;
    } else {
      this.selectedTab = tab.name;
      this.#cacheSelectedTab(tab.name);
      this.isDropdownOpen = false;
    }
  }

  selectDropdownOption(tabName: string, option: DropdownOption) {
    this.selectedTab = tabName;
    this.#cacheSelectedTab(tabName);
    this.selectedSetting = option.action;
    this.isDropdownOpen = false;
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

  #cacheSelectedTab(tabName: string) {
    sessionStorage.setItem(this.#sessionStorageCacheKey, tabName);
  }
}
