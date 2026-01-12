// Role-based access control utilities for Chuckbox

export type MemberRole = 'admin' | 'treasurer' | 'leader' | 'parent' | 'scout'

// Pages in the application
export type AppPage =
  | 'dashboard'
  | 'scouts'
  | 'accounts'
  | 'billing'
  | 'payments'
  | 'reports'
  | 'members'

// Actions that can be performed
export type AppAction =
  | 'manage_scouts'      // Add/edit/delete scouts
  | 'delete_scouts'      // Delete scouts (more restricted)
  | 'manage_billing'     // Create/edit billing records
  | 'delete_billing'     // Delete billing records
  | 'record_payments'    // Record new payments
  | 'void_payments'      // Void existing payments
  | 'manage_members'     // Invite/remove/change roles
  | 'view_all_accounts'  // View all scout accounts
  | 'adjust_accounts'    // Make manual account adjustments
  | 'export_reports'     // Export report data

// Page access by role
const PAGE_ACCESS: Record<AppPage, MemberRole[]> = {
  dashboard: ['admin', 'treasurer', 'leader', 'parent', 'scout'],
  scouts: ['admin', 'treasurer', 'leader', 'parent'], // Parent sees filtered view
  accounts: ['admin', 'treasurer', 'leader', 'parent', 'scout'], // Parent/Scout see filtered view
  billing: ['admin', 'treasurer'],
  payments: ['admin', 'treasurer'],
  reports: ['admin', 'treasurer', 'leader'],
  members: ['admin'],
}

// Action permissions by role
const ACTION_ACCESS: Record<AppAction, MemberRole[]> = {
  manage_scouts: ['admin', 'treasurer', 'leader'],
  delete_scouts: ['admin'],
  manage_billing: ['admin', 'treasurer'],
  delete_billing: ['admin'],
  record_payments: ['admin', 'treasurer'],
  void_payments: ['admin'],
  manage_members: ['admin'],
  view_all_accounts: ['admin', 'treasurer', 'leader'],
  adjust_accounts: ['admin', 'treasurer'],
  export_reports: ['admin', 'treasurer', 'leader'],
}

// Navigation items with their required pages
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', page: 'dashboard' as AppPage },
  { href: '/scouts', label: 'Scouts', page: 'scouts' as AppPage },
  { href: '/accounts', label: 'Accounts', page: 'accounts' as AppPage },
  { href: '/billing', label: 'Billing', page: 'billing' as AppPage },
  { href: '/payments', label: 'Payments', page: 'payments' as AppPage },
  { href: '/reports', label: 'Reports', page: 'reports' as AppPage },
  { href: '/members', label: 'Members', page: 'members' as AppPage },
]

/**
 * Check if a role can access a specific page
 */
export function canAccessPage(role: MemberRole | string, page: AppPage): boolean {
  const allowedRoles = PAGE_ACCESS[page]
  return allowedRoles.includes(role as MemberRole)
}

/**
 * Check if a role can perform a specific action
 */
export function canPerformAction(role: MemberRole | string, action: AppAction): boolean {
  const allowedRoles = ACTION_ACCESS[action]
  return allowedRoles.includes(role as MemberRole)
}

/**
 * Get navigation items visible to a specific role
 */
export function getVisibleNavItems(role: MemberRole | string) {
  return NAV_ITEMS.filter(item => canAccessPage(role, item.page))
}

/**
 * Check if role is a financial role (admin or treasurer)
 */
export function isFinancialRole(role: MemberRole | string): boolean {
  return role === 'admin' || role === 'treasurer'
}

/**
 * Check if role is a management role (admin, treasurer, or leader)
 */
export function isManagementRole(role: MemberRole | string): boolean {
  return role === 'admin' || role === 'treasurer' || role === 'leader'
}

/**
 * Check if role has limited/filtered view (parent or scout)
 */
export function hasFilteredView(role: MemberRole | string): boolean {
  return role === 'parent' || role === 'scout'
}

/**
 * Check if role is admin
 */
export function isAdmin(role: MemberRole | string): boolean {
  return role === 'admin'
}
