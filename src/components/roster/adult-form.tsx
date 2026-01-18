'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateRosterAdult } from '@/app/actions/roster'

const MEMBER_TYPES = [
  { value: 'LEADER', label: 'Leader' },
  { value: 'P 18+', label: 'Parent' },
]

interface AdultFormProps {
  unitId: string
  adult: {
    id: string
    user_id: string | null // null means imported profile without app account
    first_name: string | null
    last_name: string | null
    email: string | null
    email_secondary: string | null
    phone_primary: string | null
    phone_secondary: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    address_zip: string | null
    member_type: string | null
    position: string | null
    position_2: string | null
    bsa_member_id: string | null
    is_active: boolean | null
  }
  onClose: () => void
  onSuccess: () => void
}

export function AdultForm({ unitId, adult, onClose, onSuccess }: AdultFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Track mount state for portal (SSR compatibility)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const result = await updateRosterAdult(unitId, adult.id, {
      first_name: (formData.get('first_name') as string) || null,
      last_name: (formData.get('last_name') as string) || null,
      email: adult.user_id ? null : (formData.get('email') as string) || null,
      email_secondary: (formData.get('email_secondary') as string) || null,
      phone_primary: (formData.get('phone_primary') as string) || null,
      phone_secondary: (formData.get('phone_secondary') as string) || null,
      address_street: (formData.get('address_street') as string) || null,
      address_city: (formData.get('address_city') as string) || null,
      address_state: (formData.get('address_state') as string) || null,
      address_zip: (formData.get('address_zip') as string) || null,
      member_type: (formData.get('member_type') as string) || null,
      position: (formData.get('position') as string) || null,
      position_2: (formData.get('position_2') as string) || null,
      bsa_member_id: (formData.get('bsa_member_id') as string) || null,
      is_active: formData.get('is_active') === 'on',
    })

    setIsLoading(false)

    if (result.success) {
      router.refresh()
      onSuccess()
    } else {
      setError(result.error || 'Failed to update adult')
    }
  }

  // Don't render until mounted (for SSR)
  if (!mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Edit Adult</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                name="first_name"
                required
                defaultValue={adult.first_name || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                name="last_name"
                required
                defaultValue={adult.last_name || ''}
              />
            </div>
          </div>

          {/* Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Primary Email</Label>
              {adult.user_id ? (
                // Email is linked to app account - cannot be edited
                <>
                  <Input
                    value={adult.email || ''}
                    disabled
                    className="bg-stone-50 text-stone-600"
                  />
                  <p className="text-xs text-stone-500">Linked to app account</p>
                </>
              ) : (
                // Imported profile without app account - email can be edited
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={adult.email || ''}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_secondary">Secondary Email</Label>
              <Input
                id="email_secondary"
                name="email_secondary"
                type="email"
                defaultValue={adult.email_secondary || ''}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_primary">Primary Phone</Label>
              <Input
                id="phone_primary"
                name="phone_primary"
                type="tel"
                defaultValue={adult.phone_primary || ''}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_secondary">Secondary Phone</Label>
              <Input
                id="phone_secondary"
                name="phone_secondary"
                type="tel"
                defaultValue={adult.phone_secondary || ''}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address_street">Street Address</Label>
            <Input
              id="address_street"
              name="address_street"
              defaultValue={adult.address_street || ''}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_city">City</Label>
              <Input
                id="address_city"
                name="address_city"
                defaultValue={adult.address_city || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_state">State</Label>
              <Input
                id="address_state"
                name="address_state"
                defaultValue={adult.address_state || ''}
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_zip">ZIP</Label>
              <Input
                id="address_zip"
                name="address_zip"
                defaultValue={adult.address_zip || ''}
                maxLength={10}
              />
            </div>
          </div>

          {/* BSA Info */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium text-stone-900">BSA Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member_type">Member Type</Label>
                <select
                  id="member_type"
                  name="member_type"
                  defaultValue={adult.member_type || ''}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  {MEMBER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bsa_member_id">BSA Member ID</Label>
                <Input
                  id="bsa_member_id"
                  name="bsa_member_id"
                  defaultValue={adult.bsa_member_id || ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  name="position"
                  defaultValue={adult.position || ''}
                  placeholder="e.g., Scoutmaster"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position_2">Secondary Position</Label>
                <Input
                  id="position_2"
                  name="position_2"
                  defaultValue={adult.position_2 || ''}
                  placeholder="e.g., Committee Member"
                />
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              defaultChecked={adult.is_active !== false}
              className="checkbox-native"
            />
            <Label htmlFor="is_active">Active Member</Label>
          </div>

          {error && (
            <div className="rounded-md bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} loadingText="Saving...">
              Update Adult
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  // Use portal to render modal at document body level
  // This escapes any parent transforms that could affect fixed positioning
  return createPortal(modalContent, document.body)
}
