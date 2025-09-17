export function getUserPermissionsFor(appCode: string) {
  const user = JSON.parse(sessionStorage.getItem('userApplicationRole') || '{}');
  const permissions = user?.appRole?.appRolePermissionList || [];

  const appPerm = permissions.find((perm: any) => perm.appRegister.appCode === appCode);

  console.log("permissions fetched for ", appCode, appPerm);
  console.log("permissions ", permissions);


  return {
    canView: appPerm?.canView || false,
    canEdit: appPerm?.canUpdate || false,
    canDelete: appPerm?.canDelete || false,
    canCreate: appPerm?.canCreate || false,
  };
}

export interface Permission {
  module: string;       
  actions: string[];    
}

export function hasOnlyCheckoutPermission(): boolean {
  const user = JSON.parse(sessionStorage.getItem('userApplicationRole') || '{}');
  if (!user?.appRole?.appRolePermissionList) return false;

  const permissions = user.appRole.appRolePermissionList;

  const activePermissions = permissions.filter(
    (p: any) => p.canView || p.canCreate || p.canDelete || p.canUpdate
  );

  console.log("activePermissions", activePermissions);
  

  const checkoutPerm = activePermissions.find(
    (p: any) => p.appRegister.appCode === 'POS_CHKOUT'
  );

  console.log("checkoutPerm", checkoutPerm);

  if (!checkoutPerm) return false;

  return activePermissions.length === 1;
}

export function isSuperUser(): boolean {
  const roles = sessionStorage.getItem("role");
  return roles?.includes("ROLE_ADMIN") ?? false;
}

export function hasOnlyKitchenPermissions(): boolean {
  const user = JSON.parse(sessionStorage.getItem('userApplicationRole') || '{}');
  if (!user?.appRole?.appRolePermissionList) return false;

  const permissions = user.appRole.appRolePermissionList;

  const activePermissions = permissions.filter(
    (p: any) => p.canView || p.canCreate || p.canDelete || p.canUpdate
  );

  console.log("activePermissions", activePermissions);

  const kitchenPermissions = activePermissions.filter(
    (p: any) => p.appRegister?.appCode?.startsWith("kitchen")
  );

  console.log("kitchenPermissions", kitchenPermissions);

  if (kitchenPermissions.length === 0) return false;

  return activePermissions.length === kitchenPermissions.length;
}
