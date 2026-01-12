import { describe, it, expect } from 'vitest'
import {
  canAccessPage,
  canPerformAction,
  getVisibleNavItems,
  isFinancialRole,
  isManagementRole,
  hasFilteredView,
  isAdmin,
  type MemberRole,
  type AppPage,
  type AppAction,
} from '@/lib/roles'

describe('roles', () => {
  describe('canAccessPage', () => {
    const allRoles: MemberRole[] = ['admin', 'treasurer', 'leader', 'parent', 'scout']

    describe('dashboard', () => {
      it('should allow all roles to access dashboard', () => {
        allRoles.forEach(role => {
          expect(canAccessPage(role, 'dashboard')).toBe(true)
        })
      })
    })

    describe('scouts', () => {
      it('should allow admin, treasurer, leader, parent to access scouts', () => {
        expect(canAccessPage('admin', 'scouts')).toBe(true)
        expect(canAccessPage('treasurer', 'scouts')).toBe(true)
        expect(canAccessPage('leader', 'scouts')).toBe(true)
        expect(canAccessPage('parent', 'scouts')).toBe(true)
      })

      it('should deny scout role access to scouts page', () => {
        expect(canAccessPage('scout', 'scouts')).toBe(false)
      })
    })

    describe('billing', () => {
      it('should only allow admin and treasurer to access billing', () => {
        expect(canAccessPage('admin', 'billing')).toBe(true)
        expect(canAccessPage('treasurer', 'billing')).toBe(true)
      })

      it('should deny leader, parent, scout access to billing', () => {
        expect(canAccessPage('leader', 'billing')).toBe(false)
        expect(canAccessPage('parent', 'billing')).toBe(false)
        expect(canAccessPage('scout', 'billing')).toBe(false)
      })
    })

    describe('payments', () => {
      it('should allow admin, treasurer, parent to access payments', () => {
        expect(canAccessPage('admin', 'payments')).toBe(true)
        expect(canAccessPage('treasurer', 'payments')).toBe(true)
        expect(canAccessPage('parent', 'payments')).toBe(true)
      })

      it('should deny leader and scout access to payments', () => {
        expect(canAccessPage('leader', 'payments')).toBe(false)
        expect(canAccessPage('scout', 'payments')).toBe(false)
      })
    })

    describe('members', () => {
      it('should only allow admin to access members', () => {
        expect(canAccessPage('admin', 'members')).toBe(true)
      })

      it('should deny all other roles access to members', () => {
        expect(canAccessPage('treasurer', 'members')).toBe(false)
        expect(canAccessPage('leader', 'members')).toBe(false)
        expect(canAccessPage('parent', 'members')).toBe(false)
        expect(canAccessPage('scout', 'members')).toBe(false)
      })
    })

    describe('reports', () => {
      it('should allow admin, treasurer, leader to access reports', () => {
        expect(canAccessPage('admin', 'reports')).toBe(true)
        expect(canAccessPage('treasurer', 'reports')).toBe(true)
        expect(canAccessPage('leader', 'reports')).toBe(true)
      })

      it('should deny parent and scout access to reports', () => {
        expect(canAccessPage('parent', 'reports')).toBe(false)
        expect(canAccessPage('scout', 'reports')).toBe(false)
      })
    })

    describe('pay (parent payment portal)', () => {
      it('should only allow parent to access pay', () => {
        expect(canAccessPage('parent', 'pay')).toBe(true)
      })

      it('should deny all other roles access to pay', () => {
        expect(canAccessPage('admin', 'pay')).toBe(false)
        expect(canAccessPage('treasurer', 'pay')).toBe(false)
        expect(canAccessPage('leader', 'pay')).toBe(false)
        expect(canAccessPage('scout', 'pay')).toBe(false)
      })
    })
  })

  describe('canPerformAction', () => {
    describe('manage_scouts', () => {
      it('should allow admin, treasurer, leader to manage scouts', () => {
        expect(canPerformAction('admin', 'manage_scouts')).toBe(true)
        expect(canPerformAction('treasurer', 'manage_scouts')).toBe(true)
        expect(canPerformAction('leader', 'manage_scouts')).toBe(true)
      })

      it('should deny parent and scout from managing scouts', () => {
        expect(canPerformAction('parent', 'manage_scouts')).toBe(false)
        expect(canPerformAction('scout', 'manage_scouts')).toBe(false)
      })
    })

    describe('delete_scouts', () => {
      it('should only allow admin to delete scouts', () => {
        expect(canPerformAction('admin', 'delete_scouts')).toBe(true)
      })

      it('should deny all other roles from deleting scouts', () => {
        expect(canPerformAction('treasurer', 'delete_scouts')).toBe(false)
        expect(canPerformAction('leader', 'delete_scouts')).toBe(false)
        expect(canPerformAction('parent', 'delete_scouts')).toBe(false)
        expect(canPerformAction('scout', 'delete_scouts')).toBe(false)
      })
    })

    describe('record_payments', () => {
      it('should allow admin and treasurer to record payments', () => {
        expect(canPerformAction('admin', 'record_payments')).toBe(true)
        expect(canPerformAction('treasurer', 'record_payments')).toBe(true)
      })

      it('should deny other roles from recording payments', () => {
        expect(canPerformAction('leader', 'record_payments')).toBe(false)
        expect(canPerformAction('parent', 'record_payments')).toBe(false)
        expect(canPerformAction('scout', 'record_payments')).toBe(false)
      })
    })

    describe('void_payments', () => {
      it('should only allow admin to void payments', () => {
        expect(canPerformAction('admin', 'void_payments')).toBe(true)
      })

      it('should deny all other roles from voiding payments', () => {
        expect(canPerformAction('treasurer', 'void_payments')).toBe(false)
        expect(canPerformAction('leader', 'void_payments')).toBe(false)
        expect(canPerformAction('parent', 'void_payments')).toBe(false)
        expect(canPerformAction('scout', 'void_payments')).toBe(false)
      })
    })

    describe('manage_members', () => {
      it('should only allow admin to manage members', () => {
        expect(canPerformAction('admin', 'manage_members')).toBe(true)
      })

      it('should deny all other roles from managing members', () => {
        expect(canPerformAction('treasurer', 'manage_members')).toBe(false)
        expect(canPerformAction('leader', 'manage_members')).toBe(false)
        expect(canPerformAction('parent', 'manage_members')).toBe(false)
        expect(canPerformAction('scout', 'manage_members')).toBe(false)
      })
    })

    describe('adjust_accounts', () => {
      it('should allow admin and treasurer to adjust accounts', () => {
        expect(canPerformAction('admin', 'adjust_accounts')).toBe(true)
        expect(canPerformAction('treasurer', 'adjust_accounts')).toBe(true)
      })

      it('should deny other roles from adjusting accounts', () => {
        expect(canPerformAction('leader', 'adjust_accounts')).toBe(false)
        expect(canPerformAction('parent', 'adjust_accounts')).toBe(false)
        expect(canPerformAction('scout', 'adjust_accounts')).toBe(false)
      })
    })
  })

  describe('getVisibleNavItems', () => {
    it('should return all nav items for admin', () => {
      const items = getVisibleNavItems('admin')
      expect(items.map(i => i.page)).toEqual([
        'dashboard', 'scouts', 'accounts', 'billing', 'payments', 'reports', 'members'
      ])
    })

    it('should return correct items for treasurer', () => {
      const items = getVisibleNavItems('treasurer')
      expect(items.map(i => i.page)).toEqual([
        'dashboard', 'scouts', 'accounts', 'billing', 'payments', 'reports'
      ])
    })

    it('should return correct items for leader', () => {
      const items = getVisibleNavItems('leader')
      expect(items.map(i => i.page)).toEqual([
        'dashboard', 'scouts', 'accounts', 'reports'
      ])
    })

    it('should return correct items for parent', () => {
      const items = getVisibleNavItems('parent')
      expect(items.map(i => i.page)).toEqual([
        'dashboard', 'scouts', 'accounts', 'payments', 'pay'
      ])
    })

    it('should return correct items for scout', () => {
      const items = getVisibleNavItems('scout')
      expect(items.map(i => i.page)).toEqual([
        'dashboard', 'accounts'
      ])
    })
  })

  describe('isFinancialRole', () => {
    it('should return true for admin and treasurer', () => {
      expect(isFinancialRole('admin')).toBe(true)
      expect(isFinancialRole('treasurer')).toBe(true)
    })

    it('should return false for leader, parent, scout', () => {
      expect(isFinancialRole('leader')).toBe(false)
      expect(isFinancialRole('parent')).toBe(false)
      expect(isFinancialRole('scout')).toBe(false)
    })
  })

  describe('isManagementRole', () => {
    it('should return true for admin, treasurer, leader', () => {
      expect(isManagementRole('admin')).toBe(true)
      expect(isManagementRole('treasurer')).toBe(true)
      expect(isManagementRole('leader')).toBe(true)
    })

    it('should return false for parent and scout', () => {
      expect(isManagementRole('parent')).toBe(false)
      expect(isManagementRole('scout')).toBe(false)
    })
  })

  describe('hasFilteredView', () => {
    it('should return true for parent and scout', () => {
      expect(hasFilteredView('parent')).toBe(true)
      expect(hasFilteredView('scout')).toBe(true)
    })

    it('should return false for admin, treasurer, leader', () => {
      expect(hasFilteredView('admin')).toBe(false)
      expect(hasFilteredView('treasurer')).toBe(false)
      expect(hasFilteredView('leader')).toBe(false)
    })
  })

  describe('isAdmin', () => {
    it('should return true only for admin', () => {
      expect(isAdmin('admin')).toBe(true)
    })

    it('should return false for all other roles', () => {
      expect(isAdmin('treasurer')).toBe(false)
      expect(isAdmin('leader')).toBe(false)
      expect(isAdmin('parent')).toBe(false)
      expect(isAdmin('scout')).toBe(false)
    })
  })
})
