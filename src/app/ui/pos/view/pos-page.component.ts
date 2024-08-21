import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-pos-page',
  templateUrl: './pos-page.component.html',
  styleUrl: './pos-page.component.scss',
  encapsulation: ViewEncapsulation.Emulated 
})
export class PosPageComponent {
  isDropdownOpen = false;
  selectedTab: string = 'dashboard'; 
  selectedSetting: string | null = null;

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    console.log(this.isDropdownOpen)
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    this.isDropdownOpen = false; 
  }

  selectSetting(setting: string) {
    this.selectedTab = 'settings'; 
    this.selectedSetting = setting;
    this.isDropdownOpen = false; 
  }
  
}
