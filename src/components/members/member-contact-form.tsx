'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateMemberProfile } from '@/app/actions/members'

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

interface MemberContactFormProps {
  membershipId: string
  profile: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    gender: Gender | null
    phone_primary: string | null
    phone_secondary: string | null
    email_secondary: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    address_zip: string | null
  }
}

export function MemberContactForm({ membershipId, profile }: MemberContactFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const genderValue = formData.get('gender') as string

    const result = await updateMemberProfile(profile.id, {
      first_name: formData.get('first_name') as string || null,
      last_name: formData.get('last_name') as string || null,
      gender: genderValue && genderValue !== '' ? genderValue as Gender : null,
      phone_primary: formData.get('phone_primary') as string || null,
      phone_secondary: formData.get('phone_secondary') as string || null,
      email_secondary: formData.get('email_secondary') as string || null,
      address_street: formData.get('address_street') as string || null,
      address_city: formData.get('address_city') as string || null,
      address_state: formData.get('address_state') as string || null,
      address_zip: formData.get('address_zip') as string || null,
    })

    setIsLoading(false)

    if (result.success) {
      setMessage({ type: 'success', text: 'Contact information updated successfully!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update contact information' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
        <CardDescription>Update this member's contact details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={profile.first_name || ''}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={profile.last_name || ''}
                placeholder="Enter last name"
              />
            </div>
          </div>

          {/* Gender Field */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              name="gender"
              defaultValue={profile.gender || ''}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
            >
              <option value="">Select gender...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
            <p className="text-xs text-stone-500">
              Used for assigning to the appropriate section in coed troops
            </p>
          </div>

          {/* Contact Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone_primary">Primary Phone</Label>
              <Input
                id="phone_primary"
                name="phone_primary"
                type="tel"
                defaultValue={profile.phone_primary || ''}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_secondary">Secondary Phone</Label>
              <Input
                id="phone_secondary"
                name="phone_secondary"
                type="tel"
                defaultValue={profile.phone_secondary || ''}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_secondary">Secondary Email</Label>
            <Input
              id="email_secondary"
              name="email_secondary"
              type="email"
              defaultValue={profile.email_secondary || ''}
              placeholder="alternate@email.com"
            />
            <p className="text-xs text-stone-500">
              Primary email ({profile.email}) cannot be changed here
            </p>
          </div>

          {/* Address Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-stone-700">Address</h4>
            <div className="space-y-2">
              <Label htmlFor="address_street">Street Address</Label>
              <Input
                id="address_street"
                name="address_street"
                defaultValue={profile.address_street || ''}
                placeholder="Enter street address"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="address_city">City</Label>
                <Input
                  id="address_city"
                  name="address_city"
                  defaultValue={profile.address_city || ''}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_state">State</Label>
                <Input
                  id="address_state"
                  name="address_state"
                  defaultValue={profile.address_state || ''}
                  placeholder="State"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_zip">ZIP Code</Label>
                <Input
                  id="address_zip"
                  name="address_zip"
                  defaultValue={profile.address_zip || ''}
                  placeholder="ZIP"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.type === 'success'
                  ? 'bg-success-light text-success'
                  : 'bg-error-light text-error'
              }`}
            >
              {message.text}
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
