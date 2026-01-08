'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deactivateAccount } from '@/app/actions/profile'

export function DangerZone() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsLoading(true)
    setError(null)

    const result = await deactivateAccount()

    if (result.success) {
      // Redirect to login page
      router.push('/login?message=account_deleted')
    } else {
      setIsLoading(false)
      setError(result.error || 'Failed to delete account')
    }
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-600">Danger Zone</CardTitle>
        <CardDescription>
          Irreversible and destructive actions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <h4 className="font-medium text-red-800">Delete Account</h4>
          <p className="mt-1 text-sm text-red-700">
            Once you delete your account, you will be logged out and unable to log back in.
            Your unit memberships will be deactivated. This action cannot be undone by you,
            but a unit administrator may be able to restore your access.
          </p>

          {error && (
            <div className="mt-3 rounded-md bg-red-100 p-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading}>
                  {isLoading ? 'Deleting...' : 'Delete My Account'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will deactivate your account and log you out. You will not be able
                    to log back in until a unit administrator reactivates your account.
                    All your unit memberships will be set to inactive.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, Delete My Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
