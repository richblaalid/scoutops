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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface PaymentProcessingCardProps {
  // Square props
  isConnected: boolean
  merchantId?: string | null
  connectedAt?: string | null
  lastSyncAt?: string | null
  environment?: 'sandbox' | 'production' | null
  // Fee props
  unitId: string
  processingFeePercent: number
  processingFeeFixed: number
  passFeesToPayer: boolean
  effectiveRate?: number | null
  // Common
  isAdmin: boolean
}

export function PaymentProcessingCard({
  isConnected,
  merchantId,
  connectedAt,
  lastSyncAt,
  environment,
  unitId,
  processingFeePercent,
  processingFeeFixed,
  passFeesToPayer,
  effectiveRate,
  isAdmin,
}: PaymentProcessingCardProps) {
  const router = useRouter()

  // Square state
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [squareError, setSquareError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null)

  // Fee state
  const [isEditingFees, setIsEditingFees] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [feeError, setFeeError] = useState<string | null>(null)
  const [feeSuccess, setFeeSuccess] = useState(false)
  const [isSavingFees, setIsSavingFees] = useState(false)

  // Fee form state
  const [feePercent, setFeePercent] = useState((processingFeePercent * 100).toFixed(2))
  const [feeFixed, setFeeFixed] = useState(processingFeeFixed.toFixed(2))
  const [passFees, setPassFees] = useState(passFeesToPayer)

  // Collapsible state
  const [feesOpen, setFeesOpen] = useState(false)

  // Check if fee values have changed
  const hasChanges =
    feePercent !== (processingFeePercent * 100).toFixed(2) ||
    feeFixed !== processingFeeFixed.toFixed(2) ||
    passFees !== passFeesToPayer

  // Square handlers
  async function handleSync() {
    setIsSyncing(true)
    setSquareError(null)
    setSyncResult(null)

    try {
      const response = await fetch('/api/square/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync transactions')
      }

      setSyncResult({ synced: data.synced, errors: data.errors || [] })
      router.refresh()
    } catch (err) {
      setSquareError(err instanceof Error ? err.message : 'Failed to sync transactions')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleDisconnect() {
    setIsLoading(true)
    setSquareError(null)

    try {
      const response = await fetch('/api/square/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect Square')
      }

      router.refresh()
    } catch (err) {
      setSquareError(err instanceof Error ? err.message : 'Failed to disconnect Square')
      setIsLoading(false)
    }
  }

  function handleConnect() {
    setIsLoading(true)
    window.location.href = '/api/square/oauth/authorize'
  }

  // Fee handlers
  function handleCancelFees() {
    setFeePercent((processingFeePercent * 100).toFixed(2))
    setFeeFixed(processingFeeFixed.toFixed(2))
    setPassFees(passFeesToPayer)
    setIsEditingFees(false)
    setFeeError(null)
  }

  function handleSaveFeeClick() {
    if (hasChanges) {
      setShowConfirmDialog(true)
    }
  }

  async function handleConfirmedFeeSave() {
    setShowConfirmDialog(false)
    setIsSavingFees(true)
    setFeeError(null)
    setFeeSuccess(false)

    try {
      const response = await fetch('/api/settings/payment-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      setFeeSuccess(true)
      setIsEditingFees(false)
      router.refresh()
      setTimeout(() => setFeeSuccess(false), 3000)
    } catch (err) {
      setFeeError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSavingFees(false)
    }
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Calculate example fee for $100 payment
  const exampleAmount = 100
  const calculatedFee = exampleAmount * (parseFloat(feePercent) / 100) + parseFloat(feeFixed)
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-600">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <CardTitle>Payment Processing</CardTitle>
              <CardDescription>Accept online payments from scouts and parents</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Square Section */}
          <div className="rounded-lg border border-stone-200 overflow-hidden">
            <div className="bg-stone-50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-stone-900 flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-11h4v4h-4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700">Square</p>
                  <p className="text-xs text-stone-500">Credit card processing</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isConnected && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      environment === 'production'
                        ? 'bg-success-light text-success'
                        : 'bg-warning-light text-warning'
                    }`}
                  >
                    {environment === 'production' ? 'Production' : 'Sandbox'}
                  </span>
                )}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    isConnected ? 'bg-success-light text-success' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {isConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {isConnected ? (
                <>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-stone-500 text-xs">Merchant ID</p>
                      <p className="font-mono text-xs">{merchantId || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-stone-500 text-xs">Connected</p>
                      <p className="text-xs">{formatDate(connectedAt)}</p>
                    </div>
                    <div>
                      <p className="text-stone-500 text-xs">Last Synced</p>
                      <p className="text-xs">{formatDate(lastSyncAt)}</p>
                    </div>
                  </div>

                  {squareError && (
                    <div className="rounded-md bg-error-light p-2 text-xs text-error">{squareError}</div>
                  )}

                  {syncResult && (
                    <div className={`rounded-md p-2 text-xs ${syncResult.errors.length > 0 ? 'bg-warning-light text-warning' : 'bg-success-light text-success'}`}>
                      Synced {syncResult.synced} transaction{syncResult.synced !== 1 ? 's' : ''}
                      {syncResult.errors.length > 0 && (
                        <span> with {syncResult.errors.length} error{syncResult.errors.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleSync} disabled={isSyncing || isLoading}>
                        {isSyncing ? 'Syncing...' : 'Sync Transactions'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="border-error text-error hover:bg-error-light" disabled={isLoading || isSyncing}>
                            {isLoading ? 'Disconnecting...' : 'Disconnect'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disconnect Square?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will disconnect your Square account. You will no longer be able to
                              accept online payments until you reconnect. Existing transaction data
                              will be preserved.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDisconnect} className="bg-error hover:bg-error/90">
                              Disconnect Square
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-stone-600">
                    Connect your Square account to accept credit card payments. Payments will be
                    deposited directly into your Square-linked bank account.
                  </p>

                  {squareError && (
                    <div className="rounded-md bg-error-light p-2 text-xs text-error">{squareError}</div>
                  )}

                  {isAdmin ? (
                    <Button size="sm" onClick={handleConnect} disabled={isLoading}>
                      {isLoading ? 'Connecting...' : 'Connect Square'}
                    </Button>
                  ) : (
                    <p className="text-xs text-stone-500">Only unit administrators can connect Square.</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Processing Fees Section - only show when connected */}
          {isConnected && (
            <Collapsible open={feesOpen} onOpenChange={setFeesOpen}>
              <div className="rounded-lg border border-stone-200 overflow-hidden">
                <CollapsibleTrigger className="w-full bg-stone-50 px-4 py-3 flex items-center justify-between hover:bg-stone-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-amber-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-stone-700">Processing Fees</p>
                      <p className="text-xs text-stone-500">
                        {passFees ? 'Passed to payer' : 'Absorbed by unit'} • {(processingFeePercent * 100).toFixed(2)}% + ${processingFeeFixed.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`h-5 w-5 text-stone-400 transition-transform ${feesOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-4 space-y-4 border-t border-stone-200">
                    {/* Fee Rate Settings */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="feePercent" className="text-xs">Fee Percentage (%)</Label>
                        <Input
                          id="feePercent"
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          value={feePercent}
                          onChange={(e) => setFeePercent(e.target.value)}
                          disabled={!isEditingFees || isSavingFees}
                          className={`font-mono text-sm h-8 ${!isEditingFees ? 'bg-stone-50' : ''}`}
                        />
                        <p className="text-xs text-stone-500">Square default: 2.60%</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="feeFixed" className="text-xs">Fixed Fee ($)</Label>
                        <Input
                          id="feeFixed"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={feeFixed}
                          onChange={(e) => setFeeFixed(e.target.value)}
                          disabled={!isEditingFees || isSavingFees}
                          className={`font-mono text-sm h-8 ${!isEditingFees ? 'bg-stone-50' : ''}`}
                        />
                        <p className="text-xs text-stone-500">Square default: $0.10</p>
                      </div>
                    </div>

                    {/* Effective Rate Display */}
                    {effectiveRate !== null && effectiveRate !== undefined && (
                      <div className="rounded-md bg-stone-50 p-3">
                        <p className="text-xs font-medium text-stone-700">Effective Rate (last 30 days)</p>
                        <p className="text-lg font-bold text-stone-900">{(effectiveRate * 100).toFixed(2)}%</p>
                      </div>
                    )}

                    {/* Pass Fees Toggle */}
                    <div className={`flex items-center justify-between rounded-md border p-3 ${!isEditingFees ? 'bg-stone-50' : ''}`}>
                      <div className="space-y-0.5">
                        <Label htmlFor="passFees" className="text-sm font-medium">Pass fees to payer</Label>
                        <p className="text-xs text-stone-500">
                          Add processing fees to payment amount instead of deducting from proceeds.
                        </p>
                      </div>
                      <Switch
                        id="passFees"
                        checked={passFees}
                        onCheckedChange={setPassFees}
                        disabled={!isEditingFees || isSavingFees}
                      />
                    </div>

                    {/* Example Calculation */}
                    <div className="rounded-md bg-stone-50 p-3 text-xs">
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
                      </div>
                    </div>

                    {/* Status Messages */}
                    {feeError && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                        {feeError}
                      </div>
                    )}

                    {feeSuccess && (
                      <div className="rounded-md bg-green-50 border border-green-200 p-2 text-xs text-green-700">
                        Settings saved successfully
                      </div>
                    )}

                    {/* Action Buttons */}
                    {isAdmin && (
                      <div className="flex gap-2">
                        {isEditingFees ? (
                          <>
                            <Button size="sm" onClick={handleSaveFeeClick} disabled={isSavingFees || !hasChanges}>
                              {isSavingFees ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelFees} disabled={isSavingFees}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setIsEditingFees(true)}>
                            Edit Settings
                          </Button>
                        )}
                      </div>
                    )}

                    {!isAdmin && (
                      <p className="text-xs text-stone-500">Only unit administrators can change fee settings.</p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Future Processors Placeholder */}
          <p className="text-xs text-stone-400 text-center">
            Additional payment processors coming soon
          </p>
        </CardContent>
      </Card>

      {/* Fee Confirmation Dialog */}
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
                  These settings will apply to all future payment links.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedFeeSave}>Confirm Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
