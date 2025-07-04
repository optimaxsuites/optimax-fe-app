export interface MenuItem {
  label: string;
  code?: string;
  route?: string;
  component?: any;
  icon?: string;
  roles: string[];

  description?: string;
  shortDescription?: string;

  submenu?: MenuItem[];
  open?: boolean;
  locked?: boolean;
  active?: boolean;
}
