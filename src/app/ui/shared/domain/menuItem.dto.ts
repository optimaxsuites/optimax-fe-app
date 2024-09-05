export interface MenuItem {
    label: string;
    route?: string;
    icon?: string;
    roles: string[];
    submenu?: MenuItem[];
    open?: boolean; 
  }
  