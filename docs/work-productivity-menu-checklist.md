# Work Productivity Menu Checklist

This codebase does not build the sidebar from backend modules alone. Backend registration unlocks and filters menu items, but the visible menu labels, icons, and routes are still hardcoded in frontend menu services.

## Source Of Truth

The live root sidebar is rendered by:

- [src/app/ui/shared/view/sidebar2/sidebar2.component.ts](/Users/damilola/optimax-chatgpt/optimax_fe_app/src/app/ui/shared/view/sidebar2/sidebar2.component.ts:1)

That component reads menu data from the Settings menu service:

- [projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service.ts](/Users/damilola/optimax-chatgpt/optimax_fe_app/projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service.ts:1)

So when adding a new HR menu, update the Settings menu service first. Editing only the HR project menu files is not enough for the live shell.

## Required Steps For A New Menu

1. Backend module/app registration
   - Ensure `/x/api/v2/us/modules` returns the module/app entry.
   - The frontend `code` must exactly match backend `appCode`.
   - Example for Work Productivity: `HR_PRODUCTIVITY`

2. Role and permission payload
   - Ensure `sessionStorage.userApplicationRole.appRole.appRolePermissionList` contains the same `appCode`.
   - The menu will not render for non-superusers unless `canView` or `superuser` is true.

3. Live menu definition
   - Add the menu item in:
     - [projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service.ts](/Users/damilola/optimax-chatgpt/optimax_fe_app/projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service.ts:1)
   - Provide:
     - `label`
     - `code`
     - `route`
     - `icon`
     - `roles`

4. Navigation link mapping
   - Add or update the route helper in:
     - [projects/settings/src/app/ui/sharedComponents/service/navigation-links/navigation-links.service.ts](/Users/damilola/optimax-chatgpt/optimax_fe_app/projects/settings/src/app/ui/sharedComponents/service/navigation-links/navigation-links.service.ts:1)

5. Destination route
   - Make sure the target module has a valid Angular route.
   - For HR lazy routes, define the inner route relative to `/admin/hr`, not `admin/hr/...` again.

6. Destination component
   - Ensure the component is declared and reachable from the target route.

7. Settings / role editor exposure
   - If the module should be assignable in the role editor, align the Settings role-permission menu config and form mapping.

8. Refresh behavior
   - The sidebar should reload registered apps after login/session hydration so late-loaded permissions are reflected.

## Files Updated For Work Productivity

- Live menu item:
  - [projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service.ts](/Users/damilola/optimax-chatgpt/optimax_fe_app/projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service.ts:294)
  - [projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service.ts](/Users/damilola/optimax-chatgpt/optimax_fe_app/projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service.ts:674)

- Route helper:
  - [projects/settings/src/app/ui/sharedComponents/service/navigation-links/navigation-links.service.ts](/Users/damilola/optimax-chatgpt/optimax_fe_app/projects/settings/src/app/ui/sharedComponents/service/navigation-links/navigation-links.service.ts:82)

- HR destination route:
  - [projects/hr/src/app/app-routing.module.ts](/Users/damilola/optimax-chatgpt/optimax_fe_app/projects/hr/src/app/app-routing.module.ts:1)

## Practical Rule

If a new menu exists in backend permissions but is not showing in the UI, check these in order:

1. Is the item present in the live Settings menu service?
2. Does its `code` match backend `appCode` exactly?
3. Does the route helper point to the right module path?
4. Does the target route exist?
5. Does the current user session actually carry the permission?
