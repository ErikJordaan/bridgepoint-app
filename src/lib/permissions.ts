// Every possible thing a role can be allowed to do, grouped for display in the
// admin's role-editing screen. The set of keys is fixed (defined in code, not
// database-editable) - what's configurable is which keys each role has, stored
// in the role_permissions table.

export interface IPermissionDefinition {
  key: string;
  label: string;
  group: string;
}

export const PERMISSIONS: IPermissionDefinition[] = [
  // Opportunities
  { key: "opportunities.view_own", label: "View own opportunities", group: "Opportunities" },
  { key: "opportunities.view_all", label: "View everyone's opportunities", group: "Opportunities" },
  { key: "opportunities.create", label: "Create opportunities", group: "Opportunities" },
  { key: "opportunities.create_for_others", label: "Create/reassign opportunities on behalf of someone else", group: "Opportunities" },
  { key: "opportunities.edit", label: "Edit opportunity details", group: "Opportunities" },
  { key: "opportunities.close", label: "Close opportunities (won/lost)", group: "Opportunities" },
  { key: "opportunities.delete", label: "Delete opportunities", group: "Opportunities" },

  // Companies & Contacts
  { key: "companies.view", label: "View companies & contacts", group: "Companies & Contacts" },
  { key: "companies.edit", label: "Add/edit companies & contacts", group: "Companies & Contacts" },

  // Reporting
  { key: "reports.view_own", label: "View own dashboard", group: "Reporting" },
  { key: "reports.view_all", label: "View org-wide reporting", group: "Reporting" },

  // Administration
  { key: "admin.manage_users", label: "Manage users (create, deactivate, assign roles)", group: "Administration" },
  { key: "admin.manage_roles", label: "Manage roles & permissions", group: "Administration" },
  { key: "admin.manage_fields", label: "Manage configurable fields", group: "Administration" },
  { key: "admin.manage_stages", label: "Manage deal stages", group: "Administration" }
];

export function groupedPermissions(): { group: string; items: IPermissionDefinition[] }[] {
  const groups = Array.from(new Set(PERMISSIONS.map(p => p.group)));
  return groups.map(group => ({ group, items: PERMISSIONS.filter(p => p.group === group) }));
}
