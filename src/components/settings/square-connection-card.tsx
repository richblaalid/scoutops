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

interface SquareConnectionCardProps {
  isConnected: boolean
  merchantId?: string | null
  connectedAt?: string | null
  lastSyncAt?: string | null
  environment?: 'sandbox' | 'production' | null
  isAdmin: boolean
}

export function SquareConnectionCard({
  isConnected,
  merchantId,
  connectedAt,
  lastSyncAt,
  environment,
  isAdmin,
}: SquareConnectionCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null)

  async function handleSync() {
    setIsSyncing(true)
    setError(null)
    setSyncResult(null)

    try {
      const response = await fetch('/api/square/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync transactions')
      }

      setSyncResult({ synced: data.synced, errors: data.errors || [] })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync transactions')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleDisconnect() {
    setIsLoading(true)
    setError(null)

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
      setError(err instanceof Error ? err.message : 'Failed to disconnect Square')
      setIsLoading(false)
    }
  }

  function handleConnect() {
    setIsLoading(true)
    // Redirect to Square OAuth
    window.location.href = '/api/square/oauth/authorize'
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-stone-900 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-11h4v4h-4z" />
              </svg>
            </div>
            <div>
              <CardTitle>Square</CardTitle>
              <CardDescription>Accept credit card payments online</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  environment === 'production'
                    ? 'bg-success-light text-success'
                    : 'bg-warning-light text-warning'
                }`}
              >
                {environment === 'production' ? 'Production' : 'Sandbox'}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                isConnected
                  ? 'bg-success-light text-success'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone-500">Merchant ID</p>
                <p className="font-mono">{merchantId || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-stone-500">Connected</p>
                <p>{formatDate(connectedAt)}</p>
              </div>
              <div>
                <p className="text-stone-500">Last Synced</p>
                <p>{formatDate(lastSyncAt)}</p>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-error-light p-2 text-sm text-error">{error}</div>
            )}

            {syncResult && (
              <div className={`rounded-md p-2 text-sm ${syncResult.errors.length > 0 ? 'bg-warning-light text-warning' : 'bg-success-light text-success'}`}>
                Synced {syncResult.synced} transaction{syncResult.synced !== 1 ? 's' : ''}
                {syncResult.errors.length > 0 && (
                  <span> with {syncResult.errors.length} error{syncResult.errors.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            )}

            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing || isLoading}
                >
                  {isSyncing ? 'Syncing...' : 'Sync Transactions'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="border-error text-error hover:bg-error-light" disabled={isLoading || isSyncing}>
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
                      <AlertDialogAction
                        onClick={handleDisconnect}
                        className="bg-error hover:bg-error/90"
                      >
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
              Connect your Square account to accept credit card payments from scouts and
              parents. Payments will be deposited directly into your Square-linked bank
              account.
            </p>

            {error && (
              <div className="rounded-md bg-error-light p-2 text-sm text-error">{error}</div>
            )}

            {isAdmin ? (
              <Button onClick={handleConnect} disabled={isLoading}>
                {isLoading ? 'Connecting...' : 'Connect Square'}
              </Button>
            ) : (
              <p className="text-sm text-stone-500">
                Only unit administrators can connect Square.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
