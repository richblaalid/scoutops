'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateMemberProfile } from '@/app/actions/members'

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

interface MemberContactFormProps {
  unitId: string
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

export function MemberContactForm({ unitId, membershipId, profile }: MemberContactFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const genderValue = formData.get('gender') as string

    const result = await updateMemberProfile(unitId, profile.id, {
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
      setMessage({ type: 'success', text: 'Contact information updated!' })
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update contact information' })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name and Gender Row */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={profile.first_name || ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={profile.last_name || ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                name="gender"
                defaultValue={profile.gender || ''}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">-</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Email and Phone Row */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Primary Email</Label>
              <Input
                value={profile.email}
                disabled
                className="bg-stone-50 text-stone-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email_secondary">Secondary Email</Label>
              <Input
                id="email_secondary"
                name="email_secondary"
                type="email"
                defaultValue={profile.email_secondary || ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone_primary">Primary Phone</Label>
              <Input
                id="phone_primary"
                name="phone_primary"
                type="tel"
                defaultValue={profile.phone_primary || ''}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-1.5">
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

          {/* Address Row */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address_street">Street Address</Label>
              <Input
                id="address_street"
                name="address_street"
                defaultValue={profile.address_street || ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address_city">City</Label>
              <Input
                id="address_city"
                name="address_city"
                defaultValue={profile.address_city || ''}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="address_state">State</Label>
                <Input
                  id="address_state"
                  name="address_state"
                  defaultValue={profile.address_state || ''}
                  maxLength={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address_zip">ZIP</Label>
                <Input
                  id="address_zip"
                  name="address_zip"
                  defaultValue={profile.address_zip || ''}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
            {message && (
              <span
                className={`text-sm ${
                  message.type === 'success' ? 'text-success' : 'text-error'
                }`}
              >
                {message.text}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
