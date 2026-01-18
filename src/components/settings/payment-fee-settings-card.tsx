'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PaymentFeeSettingsCardProps {
  unitId: string
  processingFeePercent: number
  processingFeeFixed: number
  passFeesToPayer: boolean
  effectiveRate?: number | null
  isAdmin: boolean
  squareConnected: boolean
}

export function PaymentFeeSettingsCard({
  unitId,
  processingFeePercent,
  processingFeeFixed,
  passFeesToPayer,
  effectiveRate,
  isAdmin,
  squareConnected,
}: PaymentFeeSettingsCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Local state for form
  const [feePercent, setFeePercent] = useState((processingFeePercent * 100).toFixed(2))
  const [feeFixed, setFeeFixed] = useState(processingFeeFixed.toFixed(2))
  const [passFees, setPassFees] = useState(passFeesToPayer)

  // Check if values have changed
  const hasChanges =
    feePercent !== (processingFeePercent * 100).toFixed(2) ||
    feeFixed !== processingFeeFixed.toFixed(2) ||
    passFees !== passFeesToPayer

  function handleCancel() {
    // Reset to original values
    setFeePercent((processingFeePercent * 100).toFixed(2))
    setFeeFixed(processingFeeFixed.toFixed(2))
    setPassFees(passFeesToPayer)
    setIsEditing(false)
    setError(null)
  }

  function handleSaveClick() {
    if (hasChanges) {
      setShowConfirmDialog(true)
    }
  }

  async function handleConfirmedSave() {
    setShowConfirmDialog(false)
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings/payment-fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unitId,
          processingFeePercent: parseFloat(feePercent) / 100,
          processingFeeFixed: parseFloat(feeFixed),
          passFeesToPayer: passFees,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setSuccess(true)
      setIsEditing(false)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate example fee for $100 payment
  const exampleAmount = 100
  const calculatedFee =
    exampleAmount * (parseFloat(feePercent) / 100) + parseFloat(feeFixed)
  const exampleTotal = exampleAmount + (passFees ? calculatedFee : 0)

  // Summary of changes for confirmation dialog
  const changesSummary = []
  if (feePercent !== (processingFeePercent * 100).toFixed(2)) {
    changesSummary.push(`Fee percentage: ${(processingFeePercent * 100).toFixed(2)}% → ${feePercent}%`)
  }
  if (feeFixed !== processingFeeFixed.toFixed(2)) {
    changesSummary.push(`Fixed fee: $${processingFeeFixed.toFixed(2)} → $${feeFixed}`)
  }
  if (passFees !== passFeesToPayer) {
    changesSummary.push(`Pass fees to payer: ${passFeesToPayer ? 'Yes' : 'No'} → ${passFees ? 'Yes' : 'No'}`)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <CardTitle>Processing Fees</CardTitle>
                <CardDescription>
                  Configure how payment processing fees are handled
                </CardDescription>
              </div>
            </div>
            {squareConnected && isAdmin && !isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!squareConnected ? (
            <p className="text-sm text-stone-500">
              Connect Square above to configure payment processing fees.
            </p>
          ) : (
            <>
              {/* Fee Rate Settings */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="feePercent">Fee Percentage (%)</Label>
                  <Input
                    id="feePercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={feePercent}
                    onChange={(e) => setFeePercent(e.target.value)}
                    disabled={!isEditing || isLoading}
                    className={`font-mono ${!isEditing ? 'bg-stone-50' : ''}`}
                  />
                  <p className="text-xs text-stone-500">
                    Square default: 2.60%
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feeFixed">Fixed Fee ($)</Label>
                  <Input
                    id="feeFixed"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={feeFixed}
                    onChange={(e) => setFeeFixed(e.target.value)}
                    disabled={!isEditing || isLoading}
                    className={`font-mono ${!isEditing ? 'bg-stone-50' : ''}`}
                  />
                  <p className="text-xs text-stone-500">
                    Square default: $0.10
                  </p>
                </div>
              </div>

              {/* Effective Rate Display */}
              {effectiveRate !== null && effectiveRate !== undefined && (
                <div className="rounded-lg bg-stone-50 p-4">
                  <p className="text-sm font-medium text-stone-700">
                    Effective Rate from Recent Transactions
                  </p>
                  <p className="text-2xl font-bold text-stone-900">
                    {(effectiveRate * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Based on actual Square fees from your recent transactions
                  </p>
                </div>
              )}

              {/* Pass Fees Toggle */}
              <div className={`flex items-center justify-between rounded-lg border p-4 ${!isEditing ? 'bg-stone-50' : ''}`}>
                <div className="space-y-0.5">
                  <Label htmlFor="passFees" className="text-base font-medium">
                    Pass fees to payer
                  </Label>
                  <p className="text-sm text-stone-500">
                    When enabled, processing fees are added to the payment amount
                    instead of being deducted from your proceeds.
                  </p>
                </div>
                <Switch
                  id="passFees"
                  checked={passFees}
                  onCheckedChange={setPassFees}
                  disabled={!isEditing || isLoading}
                />
              </div>

              {/* Example Calculation */}
              <div className="rounded-lg bg-stone-50 p-4 text-sm">
                <p className="font-medium text-stone-700 mb-2">Example: $100 Payment</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Amount owed:</span>
                    <span>${exampleAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Processing fee:</span>
                    <span>${calculatedFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-200 pt-1 mt-1">
                    <span className="font-medium text-stone-700">
                      {passFees ? 'Payer pays:' : 'Unit receives:'}
                    </span>
                    <span className="font-medium">
                      ${passFees ? exampleTotal.toFixed(2) : (exampleAmount - calculatedFee).toFixed(2)}
                    </span>
                  </div>
                  {!passFees && (
                    <p className="text-xs text-stone-500 mt-2">
                      Scout is credited full $100, unit absorbs ${calculatedFee.toFixed(2)} fee
                    </p>
                  )}
                  {passFees && (
                    <p className="text-xs text-stone-500 mt-2">
                      Scout is credited $100, payer pays ${calculatedFee.toFixed(2)} extra for fees
                    </p>
                  )}
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                  Settings saved successfully
                </div>
              )}

              {/* Action Buttons */}
              {isEditing && isAdmin && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveClick}
                    loading={isLoading}
                    loadingText="Saving..."
                    disabled={!hasChanges}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {!isAdmin && (
                <p className="text-sm text-stone-500">
                  Only unit administrators can change fee settings.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Fee Settings Changes</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Are you sure you want to update the processing fee settings?</p>
                <div className="rounded-lg bg-stone-50 p-3 text-sm">
                  <p className="font-medium text-stone-700 mb-2">Changes:</p>
                  <ul className="space-y-1 text-stone-600">
                    {changesSummary.map((change, index) => (
                      <li key={index}>{change}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-stone-500">
                  These settings will apply to all future payment links created for your unit.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSave}>
              Confirm Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
