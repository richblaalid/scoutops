'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProfile } from '@/app/actions/profile'

interface ProfileFormProps {
  profile: {
    first_name: string | null
    last_name: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    address_zip: string | null
    email_secondary: string | null
    phone_primary: string | null
    phone_secondary: string | null
  }
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)

    const result = await updateProfile({
      first_name: formData.get('first_name') as string || null,
      last_name: formData.get('last_name') as string || null,
      address_street: formData.get('address_street') as string || null,
      address_city: formData.get('address_city') as string || null,
      address_state: formData.get('address_state') as string || null,
      address_zip: formData.get('address_zip') as string || null,
      email_secondary: formData.get('email_secondary') as string || null,
      phone_primary: formData.get('phone_primary') as string || null,
      phone_secondary: formData.get('phone_secondary') as string || null,
    })

    setIsLoading(false)

    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Update your personal details and address</CardDescription>
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
