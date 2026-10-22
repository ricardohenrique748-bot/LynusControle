/**
 * Role-Based Access Control (RBAC) Matrix
 * Defines privileged actions and permitted roles in Lynus Control.
 */

export type UserRole = 'admin' | 'finance' | 'fiscal' | 'support';

export type LynusAction =
  | 'manage_systems'
  | 'create_customer'
  | 'edit_customer'
  | 'delete_customer'
  | 'create_contract'
  | 'issue_license'
  | 'suspend_license'
  | 'reactivate_license'
  | 'reset_hardware_binding'
  | 'reconcile_finance'
  | 'create_charge'
  | 'validate_fiscal_doc'
  | 'download_fiscal_archive'
  | 'view_audit_logs'
  | 'manage_system_settings';

const ROLE_PERMISSIONS: Record<UserRole, LynusAction[]> = {
  admin: [
    'manage_systems',
    'create_customer',
    'edit_customer',
    'delete_customer',
    'create_contract',
    'issue_license',
    'suspend_license',
    'reactivate_license',
    'reset_hardware_binding',
    'reconcile_finance',
    'create_charge',
    'validate_fiscal_doc',
    'download_fiscal_archive',
    'view_audit_logs',
    'manage_system_settings',
  ],
  finance: [
    'create_customer',
    'edit_customer',
    'create_contract',
    'reconcile_finance',
    'create_charge',
    'suspend_license', // for delinquent accounts
    'reactivate_license',
    'view_audit_logs',
  ],
  fiscal: [
    'validate_fiscal_doc',
    'download_fiscal_archive',
    'view_audit_logs',
  ],
  support: [
    'issue_license',
    'reset_hardware_binding',
    'reactivate_license',
  ],
};

/**
 * Checks whether a given role can perform a specific action
 */
export function canPerformAction(role: UserRole, action: LynusAction): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(action);
}

/**
 * Returns human-readable label for roles
 */
export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrador Global';
    case 'finance':
      return 'Controladoria & Financeiro';
    case 'fiscal':
      return 'Governança Fiscal';
    case 'support':
      return 'Suporte & Operações';
    default:
      return role;
  }
}
