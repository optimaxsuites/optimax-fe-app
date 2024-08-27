import { Component, Input, Type } from '@angular/core';
import { DropdownOption, TabConfig } from '../../domain/interface/data';

@Component({
  selector: 'app-nav-tab',
  templateUrl: './nav-tab.component.html',
  styleUrl: './nav-tab.component.scss'
})
export class NavTabComponent {
  @Input() tabsConfig: TabConfig[] = []; 

  isDropdownOpen = false;
  selectedTab: string = ""; 
  selectedSetting: string | null = null;
  selectedDropdownTab: string = '';

  ngOnInit(): void{
this.selectedTab = this.tabsConfig[0]?.name
  }

  toggleDropdown(tabName:string) {
      this.isDropdownOpen = !this.isDropdownOpen
  }

  selectTab(tab: any) {

    if(tab.hasDropdown){

    this.toggleDropdown(tab.name);
    this.selectedDropdownTab = tab.name
    }else{
      this.selectedTab = tab.name;
      this.isDropdownOpen = false
    }

  }

  selectDropdownOption(tabName:string, option: DropdownOption) {
    this.selectedTab = tabName; 
    this.selectedSetting = option.action;
    this.isDropdownOpen = false; 
  }
  getComponentForOption(action: string): Type<any> | null {
    const tab = this.tabsConfig.find(t => t.dropdownOptions?.some(opt => opt.action === action));
    return tab?.dropdownOptions?.find(opt => opt.action === action)?.component || null;
  }
}
