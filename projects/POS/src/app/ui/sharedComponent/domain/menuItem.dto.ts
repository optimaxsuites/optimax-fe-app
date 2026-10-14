export interface MenuItem {
    label: string;
    route?: string;
    component?: any;
    icon?: string;
    roles: string[];
    submenu?: MenuItem[];
    open?: boolean;
    locked?: boolean;
    active?: boolean;
    code?: string;
    description?: string;
    queryParams?: Record<string, string>;
    isNotSidebarItem?: boolean;
    isSectionHeader?: boolean;
    doNotRegisterAsPermission?: boolean;
  }
