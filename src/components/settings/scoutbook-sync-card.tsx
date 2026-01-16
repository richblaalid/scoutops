'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SyncProgress } from '@/lib/sync/scoutbook/types'
import { StagedMember } from '@/lib/sync/scoutbook'

interface SyncResultDisplay {
  success: boolean
  created: number
  updated: number
  skipped: number
  errors: number
  // Adults
  adultsCreated: number
  adultsUpdated: number
  adultsLinked: number
}

interface StagingSummary {
  toCreate: number
  toUpdate: number
  toSkip: number
  total: number
  // Adults
  adultsToCreate: number
  adultsToUpdate: number
  adultsTotal: number
}

interface CliStatus {
  available: boolean
  installed: boolean
  version: string | null
  browsersInstalled: boolean
  message: string
  reason?: string
}

interface ScoutbookSyncCardProps {
  lastSyncAt?: string | null
  lastSyncMemberCount?: number | null
  isAdmin: boolean
}

export function ScoutbookSyncCard({
  lastSyncAt,
  lastSyncMemberCount,
  isAdmin,
}: ScoutbookSyncCardProps) {
  const [cliStatus, setCliStatus] = useState<CliStatus | null>(null)
  const [isCheckingCli, setIsCheckingCli] = useState(true)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SyncResultDisplay | null>(null)

  // Staging state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [stagedMembers, setStagedMembers] = useState<StagedMember[]>([])
  const [stagingSummary, setStagingSummary] = useState<StagingSummary | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Check CLI status on mount
  useEffect(() => {
    checkCliStatus()
  }, [])

  async function checkCliStatus() {
    setIsCheckingCli(true)
    try {
      const response = await fetch('/api/scoutbook/cli-status')
      const data = await response.json()
      setCliStatus(data)
    } catch {
      setCliStatus({
        available: false,
        installed: false,
        version: null,
        browsersInstalled: false,
        message: 'Could not check CLI status',
      })
    } finally {
      setIsCheckingCli(false)
    }
  }

  async function handleInstallCli() {
    setIsInstalling(true)
    setInstallProgress('Installing agent-browser CLI...')
    setError(null)

    try {
      const response = await fetch('/api/scoutbook/install-cli', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        setInstallProgress('Installation complete!')
        // Refresh CLI status
        await checkCliStatus()
      } else {
        setError(data.error || 'Installation failed')
        if (data.suggestion) {
          setError(`${data.error}\n\nTry: ${data.suggestion}`)
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to install agent-browser'
      )
    } finally {
      setIsInstalling(false)
      setInstallProgress(null)
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

  async function handleSync() {
    setIsSyncing(true)
    setError(null)
    setResult(null)
    setStagedMembers([])
    setStagingSummary(null)
    setSessionId(null)
    setProgress({
      phase: 'login',
      message: 'Starting sync...',
      current: 0,
      total: 1,
      percentComplete: 0,
    })

    try {
      const response = await fetch('/api/scoutbook/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rosterOnly: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start sync')
      }

      const data = await response.json()

      if (data.sessionId) {
        setSessionId(data.sessionId)
        await pollForCompletion(data.sessionId)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to sync from Scoutbook'
      )
      setProgress(null)
    } finally {
      setIsSyncing(false)
    }
  }

  async function pollForCompletion(pollSessionId: string) {
    const maxAttempts = 120
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `/api/scoutbook/sync/status?sessionId=${pollSessionId}`
        )
        const data = await response.json()

        if (data.progress) {
          setProgress(data.progress)
        }

        // Handle staged status - show preview
        if (data.status === 'staged') {
          setProgress(null)
          if (data.staging) {
            setStagedMembers(data.staging.members)
            setStagingSummary(data.staging.summary)
          }
          return // Exit polling, wait for user to confirm/cancel
        }

        if (data.status === 'completed') {
          setResult(data.result)
          setProgress(null)
          return
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Sync failed')
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))
        attempts++
      } catch (err) {
        throw err
      }
    }

    throw new Error('Sync timed out')
  }

  async function handleConfirmImport() {
    if (!sessionId) return

    setIsConfirming(true)
    setError(null)

    try {
      const response = await fetch('/api/scoutbook/sync/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm import')
      }

      setResult({
        success: true,
        created: data.created,
        updated: data.updated,
        skipped: data.skipped,
        errors: data.errors,
        adultsCreated: data.adultsCreated || 0,
        adultsUpdated: data.adultsUpdated || 0,
        adultsLinked: data.adultsLinked || 0,
      })
      setStagedMembers([])
      setStagingSummary(null)
      setSessionId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm import')
    } finally {
      setIsConfirming(false)
    }
  }

  async function handleCancelSync() {
    if (!sessionId) return

    setIsCancelling(true)
    setError(null)

    try {
      const response = await fetch('/api/scoutbook/sync/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel sync')
      }

      setStagedMembers([])
      setStagingSummary(null)
      setSessionId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel sync')
    } finally {
      setIsCancelling(false)
    }
  }

  const isCliReady = cliStatus?.installed && cliStatus?.browsersInstalled
  const isServerless = cliStatus?.reason === 'serverless'
  const hasStaging = stagedMembers.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <CardTitle>Scoutbook Plus</CardTitle>
              <CardDescription>
                Sync roster and advancement data from BSA
              </CardDescription>
            </div>
          </div>
          {isCheckingCli ? (
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-500">
              Checking...
            </span>
          ) : hasStaging ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
              Review Required
            </span>
          ) : isCliReady ? (
            <span className="inline-flex items-center rounded-full bg-success-light px-2 py-1 text-xs font-medium text-success">
              Ready
            </span>
          ) : isServerless ? (
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-500">
              Local Only
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-warning-light px-2 py-1 text-xs font-medium text-warning">
              Setup Required
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasStaging && (
          <p className="text-sm text-stone-600">
            Import scout roster and advancement data from Scoutbook Plus. A
            browser window will open for you to log in securely - Chuckbox never
            stores your Scoutbook password.
          </p>
        )}

        {/* CLI Status Section */}
        {!isCheckingCli && !isServerless && !hasStaging && (
          <div
            className={`rounded-md p-3 text-sm ${
              isCliReady
                ? 'bg-success-light/50 text-success'
                : 'bg-warning-light text-warning'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {isCliReady ? 'Browser Automation Ready' : 'Setup Required'}
                </p>
                <p className="text-xs opacity-80">
                  {cliStatus?.installed
                    ? 'agent-browser CLI installed'
                    : 'One-time setup needed'}
                </p>
              </div>
              {!isCliReady && isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isInstalling}
                      className="border-warning text-warning hover:bg-warning-light"
                    >
                      {isInstalling ? 'Installing...' : 'Setup'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Install Browser Automation Tool
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-3 text-left">
                          <p>
                            To sync from Scoutbook, we need to install{' '}
                            <strong>agent-browser</strong>, an open-source tool
                            that automates browser interactions.
                          </p>

                          <div className="rounded-md bg-stone-50 p-3 text-xs">
                            <p className="font-medium text-stone-700">
                              What is agent-browser?
                            </p>
                            <ul className="mt-1 list-inside list-disc space-y-1 text-stone-600">
                              <li>
                                Open-source CLI tool by{' '}
                                <a
                                  href="https://github.com/vercel-labs/agent-browser"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline"
                                >
                                  Vercel Labs
                                </a>
                              </li>
                              <li>
                                Uses Playwright to control a browser window
                              </li>
                              <li>
                                Lets you log into Scoutbook securely (we never
                                see your password)
                              </li>
                              <li>
                                Only runs when you click &quot;Sync&quot; - no
                                background processes
                              </li>
                            </ul>
                          </div>

                          <div className="rounded-md bg-stone-50 p-3 text-xs">
                            <p className="font-medium text-stone-700">
                              What will be installed?
                            </p>
                            <ul className="mt-1 list-inside list-disc space-y-1 text-stone-600">
                              <li>
                                <code className="rounded bg-stone-200 px-1">
                                  agent-browser
                                </code>{' '}
                                npm package (globally)
                              </li>
                              <li>
                                Chromium browser (~150MB, used only for sync)
                              </li>
                            </ul>
                          </div>

                          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs">
                            <p className="font-medium text-amber-800">
                              Privacy & Security
                            </p>
                            <p className="mt-1 text-amber-700">
                              Your Scoutbook credentials are entered directly in
                              the browser window - Chuckbox never sees, stores,
                              or transmits your password. The browser session is
                              completely isolated.
                            </p>
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleInstallCli}>
                        Install agent-browser
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            {installProgress && (
              <p className="mt-2 text-xs">{installProgress}</p>
            )}
          </div>
        )}

        {/* Serverless Warning */}
        {isServerless && !hasStaging && (
          <div className="rounded-md bg-stone-100 p-3 text-sm text-stone-600">
            <p className="font-medium">Local Environment Required</p>
            <p className="text-xs mt-1">
              Scoutbook sync requires running locally with{' '}
              <code className="rounded bg-stone-200 px-1">npm run dev</code>{' '}
              because it opens a browser window for secure login.
            </p>
          </div>
        )}

        {/* Staging Preview */}
        {hasStaging && stagingSummary && (
          <div className="space-y-4">
            <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
              <h3 className="font-medium text-amber-900 mb-2">
                Review Import
              </h3>
              <p className="text-sm text-amber-800 mb-3">
                The following changes will be made when you confirm:
              </p>

              <Tabs defaultValue="scouts" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="scouts">
                    Scouts ({stagingSummary.toCreate + stagingSummary.toUpdate})
                  </TabsTrigger>
                  <TabsTrigger value="adults">
                    Adults ({(stagingSummary.adultsToCreate || 0) + (stagingSummary.adultsToUpdate || 0)})
                  </TabsTrigger>
                </TabsList>

                {/* Scouts Tab */}
                <TabsContent value="scouts">
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div className="rounded-md bg-green-100 p-3">
                      <p className="text-2xl font-bold text-green-700">
                        {stagingSummary.toCreate}
                      </p>
                      <p className="text-xs text-green-600">New Scouts</p>
                    </div>
                    <div className="rounded-md bg-blue-100 p-3">
                      <p className="text-2xl font-bold text-blue-700">
                        {stagingSummary.toUpdate}
                      </p>
                      <p className="text-xs text-blue-600">Updates</p>
                    </div>
                    <div className="rounded-md bg-stone-100 p-3">
                      <p className="text-2xl font-bold text-stone-500">
                        {stagingSummary.toSkip}
                      </p>
                      <p className="text-xs text-stone-500">No Changes</p>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded border border-amber-200 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-left p-2 font-medium">Action</th>
                          <th className="text-left p-2 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stagedMembers
                          .filter((m) => m.memberType === 'YOUTH' && m.changeType !== 'skip')
                          .map((member) => (
                            <tr key={member.id} className="border-t border-stone-100">
                              <td className="p-2">
                                {member.firstName} {member.lastName}
                              </td>
                              <td className="p-2">
                                {member.changeType === 'create' && (
                                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                    Create
                                  </span>
                                )}
                                {member.changeType === 'update' && (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    Update
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-xs text-stone-500">
                                {member.changeType === 'create' && (
                                  <span>
                                    {member.rank || 'No rank'} - {member.patrol || 'No patrol'}
                                  </span>
                                )}
                                {member.changeType === 'update' && member.changes && (
                                  <span>
                                    {Object.entries(member.changes)
                                      .map(([field, change]) =>
                                        `${field}: ${change.old || '(empty)'} → ${change.new || '(empty)'}`
                                      )
                                      .join(', ')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* Adults Tab */}
                <TabsContent value="adults">
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div className="rounded-md bg-green-100 p-3">
                      <p className="text-2xl font-bold text-green-700">
                        {stagingSummary.adultsToCreate || 0}
                      </p>
                      <p className="text-xs text-green-600">New Adults</p>
                    </div>
                    <div className="rounded-md bg-blue-100 p-3">
                      <p className="text-2xl font-bold text-blue-700">
                        {stagingSummary.adultsToUpdate || 0}
                      </p>
                      <p className="text-xs text-blue-600">Updates</p>
                    </div>
                    <div className="rounded-md bg-purple-100 p-3">
                      <p className="text-2xl font-bold text-purple-700">
                        {stagedMembers.filter((m) => m.memberType !== 'YOUTH' && m.matchedProfileId).length}
                      </p>
                      <p className="text-xs text-purple-600">Matched</p>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded border border-amber-200 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-left p-2 font-medium">Type</th>
                          <th className="text-left p-2 font-medium">Position</th>
                          <th className="text-left p-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stagedMembers
                          .filter((m) => m.memberType !== 'YOUTH' && m.changeType !== 'skip')
                          .map((member) => (
                            <tr key={member.id} className="border-t border-stone-100">
                              <td className="p-2">
                                {member.firstName} {member.lastName}
                              </td>
                              <td className="p-2">
                                <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                                  {member.memberType === 'LEADER' ? 'Leader' : 'Parent'}
                                </span>
                              </td>
                              <td className="p-2 text-xs text-stone-500">
                                {member.position || '-'}
                              </td>
                              <td className="p-2">
                                {member.changeType === 'create' && (
                                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                    New
                                  </span>
                                )}
                                {member.changeType === 'update' && (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    Update
                                  </span>
                                )}
                                {member.matchedProfileId && (
                                  <span className="ml-1 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                                    {member.matchType === 'bsa_id' ? 'BSA ID' : 'Name'} Match
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        {stagedMembers.filter((m) => m.memberType !== 'YOUTH' && m.changeType !== 'skip').length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-stone-500">
                              No adult changes to import
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-2 text-xs text-stone-500">
                    Adults will be added to the roster but not invited as app users.
                    You can invite them later from the roster page.
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Confirm/Cancel Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelSync}
                disabled={isCancelling || isConfirming}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel'}
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isConfirming || isCancelling || (
                  stagingSummary.toCreate === 0 &&
                  stagingSummary.toUpdate === 0 &&
                  (stagingSummary.adultsToCreate || 0) === 0 &&
                  (stagingSummary.adultsToUpdate || 0) === 0
                )}
              >
                {isConfirming ? 'Importing...' : `Confirm Import`}
              </Button>
            </div>
          </div>
        )}

        {/* Last Sync Info */}
        {!hasStaging && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-stone-500">Last Synced</p>
              <p>{formatDate(lastSyncAt)}</p>
            </div>
            <div>
              <p className="text-stone-500">Members Synced</p>
              <p>{lastSyncMemberCount ?? 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize text-stone-600">{progress.phase}</span>
              <span className="text-stone-500">{progress.percentComplete}%</span>
            </div>
            <Progress value={progress.percentComplete} className="h-2" />
            <p className="text-sm text-stone-500">{progress.message}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md bg-error-light p-3 text-sm text-error">
            <p className="font-medium">Error</p>
            <p className="whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`rounded-md p-3 text-sm ${
              result.success
                ? 'bg-success-light text-success'
                : 'bg-warning-light text-warning'
            }`}
          >
            <p className="font-medium">
              {result.success ? 'Import Complete' : 'Import Completed with Errors'}
            </p>
            <p>
              <strong>Scouts:</strong> {result.created} created, {result.updated} updated
              {result.skipped > 0 && `, ${result.skipped} skipped`}
            </p>
            {(result.adultsCreated > 0 || result.adultsUpdated > 0) && (
              <p>
                <strong>Adults:</strong> {result.adultsCreated} created, {result.adultsUpdated} updated
                {result.adultsLinked > 0 && `, ${result.adultsLinked} linked to profiles`}
              </p>
            )}
            {result.errors > 0 && (
              <p className="text-warning">
                {result.errors} error{result.errors !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Sync Button */}
        {!hasStaging && isAdmin ? (
          <div className="flex gap-2">
            <Button
              onClick={handleSync}
              disabled={isSyncing || !isCliReady || isServerless}
            >
              {isSyncing ? 'Syncing...' : 'Sync from Scoutbook'}
            </Button>
          </div>
        ) : !hasStaging ? (
          <p className="text-sm text-stone-500">
            Only unit administrators can sync from Scoutbook.
          </p>
        ) : null}

        {/* Requirements Info */}
        {!hasStaging && (
          <div className="rounded-md bg-stone-50 p-3 text-xs text-stone-500">
            <p className="font-medium text-stone-600">How it works:</p>
            <ol className="mt-1 list-inside list-decimal space-y-1">
              <li>A browser window opens to Scoutbook Plus</li>
              <li>You log in with your BSA credentials (we never see them)</li>
              <li>Chuckbox extracts roster data for your review</li>
              <li>You confirm which scouts to create or update</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
