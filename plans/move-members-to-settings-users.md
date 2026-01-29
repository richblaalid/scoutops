# Move Members to Settings > Users

## Overview

Move the Members page from top-level navigation to a "Users" tab within Settings. Rename components from "members" to "users" to align language throughout the codebase.

## Requirements

### User Decisions
- **URL**: `/settings?tab=users` (tab within Settings page)
- **Detail links**: Use existing `/adults/[id]` route (no new detail page)
- **Migration**: Remove `/members` completely (no redirect)
- **UI**: New "Users" tab in Settings alongside Unit, Data, Integrations
- **Language**: Rename all "member" references to "user" for consistency

### Scope
- Move Members page content to Settings > Users tab
- Remove Members from sidebar navigation
- Rename components from "members" to "users"
- Link to `/adults/[id]` for user detail views
- Admin-only access (same as current)

### Out of Scope
- Changing any business logic
- Adding new features to user management
- Database schema changes (unit_memberships table keeps its name)

---

## Current State

### Navigation
- `src/lib/roles.ts` line 84: `{ href: '/members', label: 'Members', page: 'members', icon: UserCog }`
- Shows in sidebar for admin role only

### Routes
- `/members` - List all unit members, invite new members
- `/members/[id]` - Edit individual member (role, scout associations)

### Components (to be renamed)
| Current | New |
|---------|-----|
| `src/components/members/` | `src/components/settings/users/` |
| `members-list.tsx` → `MembersList` | `users-list.tsx` → `UsersList` |
| `invite-member-button.tsx` → `InviteMemberButton` | `invite-user-button.tsx` → `InviteUserButton` |
| `invite-member-form.tsx` → `InviteMemberForm` | `invite-user-form.tsx` → `InviteUserForm` |
| `member-role-editor.tsx` → `MemberRoleEditor` | `user-role-editor.tsx` → `UserRoleEditor` |
| `member-scout-associations.tsx` | `user-scout-associations.tsx` |
| `member-contact-form.tsx` | (delete - use adults/[id] instead) |

### Settings Tabs
Current tabs: Unit (admin), Data, Integrations

---

## Implementation Plan

### Phase 1: Rename Components

#### 1.1.1 Create settings/users directory and move/rename components
Move components from `src/components/members/` to `src/components/settings/users/` with new names.

#### 1.1.2 Update component internal naming
Rename exports: `MembersList` → `UsersList`, etc.

#### 1.1.3 Update imports in components
Fix any internal imports between the renamed components.

### Phase 2: Update Settings Page

#### 2.1.1 Update SettingsTabs to accept Users tab
Add `usersTabContent` prop to `SettingsTabs` component.

**File**: `src/components/settings/settings-tabs.tsx`

#### 2.1.2 Add Users tab content to Settings page
Add data fetching from old `/members/page.tsx` to `/settings/page.tsx` and pass as tab content.

**File**: `src/app/(dashboard)/settings/page.tsx`

### Phase 3: Remove Old Routes & Navigation

#### 3.1.1 Remove Members from navigation and page access
Remove Members entry from `NAV_ITEMS` array and clean up `PAGE_ACCESS`.

**File**: `src/lib/roles.ts`

#### 3.1.2 Delete old /members routes
Remove the old route files.

**Files to delete**:
- `src/app/(dashboard)/members/page.tsx`
- `src/app/(dashboard)/members/[id]/page.tsx`

#### 3.1.3 Delete old components directory
Remove the empty `src/components/members/` directory.

### Phase 4: Update References

#### 4.1.1 Update any remaining /members links
Search and replace any remaining `/members` references.

#### 4.1.2 Update server actions
Rename `src/app/actions/members.ts` → `src/app/actions/users.ts` and update function names.

---

## Files Summary

### Created
- `src/components/settings/users/users-list.tsx`
- `src/components/settings/users/invite-user-button.tsx`
- `src/components/settings/users/invite-user-form.tsx`
- `src/components/settings/users/user-role-editor.tsx`
- `src/components/settings/users/user-scout-associations.tsx`
- `src/app/actions/users.ts`

### Modified
- `src/lib/roles.ts` - Remove Members from NAV_ITEMS and PAGE_ACCESS
- `src/components/settings/settings-tabs.tsx` - Add Users tab
- `src/app/(dashboard)/settings/page.tsx` - Add users data fetching and content

### Deleted
- `src/app/(dashboard)/members/page.tsx`
- `src/app/(dashboard)/members/[id]/page.tsx`
- `src/components/members/members-list.tsx`
- `src/components/members/invite-member-button.tsx`
- `src/components/members/invite-member-form.tsx`
- `src/components/members/member-role-editor.tsx`
- `src/components/members/member-scout-associations.tsx`
- `src/components/members/member-contact-form.tsx`
- `src/app/actions/members.ts`

---

## Verification

1. Build passes: `npm run build`
2. Settings page shows "Users" tab for admin users
3. Users tab shows user list with invite functionality
4. Clicking a user links to `/adults/[id]`
5. `/members` returns 404 (no redirect)
6. Sidebar no longer shows "Members" link
7. All user management functionality works as before
8. No references to "members" remain in component names or paths (except database)

---

## Task Log

| Task | Status | Date | Commit |
|------|--------|------|--------|
| 1.1.1 Move and rename components | Complete | 2026-01-28 | |
| 1.1.2 Update component internal naming | Complete | 2026-01-28 | |
| 1.1.3 Update imports in components | Complete | 2026-01-28 | |
| 2.1.1 Update SettingsTabs component | Complete | 2026-01-28 | |
| 2.1.2 Add Users content to Settings page | Complete | 2026-01-28 | |
| 3.1.1 Remove Members from navigation | Complete | 2026-01-28 | |
| 3.1.2 Delete old /members routes | Complete | 2026-01-28 | |
| 3.1.3 Delete old components directory | Complete | 2026-01-28 | |
| 4.1.1 Update remaining /members links | Complete | 2026-01-28 | |
| 4.1.2 Rename actions/members.ts | Complete | 2026-01-28 | |
| Verification | Complete | 2026-01-28 | |
