'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScoutbookHistoryUpload } from '@/components/import/scoutbook-history-upload'
import {
  ScoutbookHistoryPreview,
  type ImportSelections,
} from '@/components/import/scoutbook-history-preview'
import { ArrowLeft, FileSpreadsheet, CheckCircle, AlertCircle, User } from 'lucide-react'
import Link from 'next/link'
import { useUnit } from '@/components/providers/unit-context'
import {
  type ParsedScoutbookHistory,
  getScoutbookHistorySummary,
} from '@/lib/import/scoutbook-history-parser'
import {
  importScoutbookHistory,
  findScoutByBsaIdOrName,
  getUnitScoutsForImport,
} from '@/app/actions/scoutbook-import'

type ImportStep = 'upload' | 'select-scout' | 'preview' | 'result'

interface ImportResult {
  ranksImported: number
  requirementsImported: number
  badgesImported: number
  leadershipImported: number
  activitiesImported: number
}

interface ScoutOption {
  id: string
  firstName: string
  lastName: string
  bsaId: string | null
}

export default function AdvancementImportPage() {
  const router = useRouter()
  const { currentUnit } = useUnit()
  const [step, setStep] = useState<ImportStep>('upload')
  const [parsedData, setParsedData] = useState<ParsedScoutbookHistory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  // Scout selection
  const [scouts, setScouts] = useState<ScoutOption[]>([])
  const [selectedScoutId, setSelectedScoutId] = useState<string | null>(null)
  const [matchedScout, setMatchedScout] = useState<ScoutOption | null>(null)
  const [isLoadingScouts, setIsLoadingScouts] = useState(false)

  // Load scouts when entering select-scout step
  useEffect(() => {
    if (step === 'select-scout' && currentUnit?.id) {
      const loadScouts = async () => {
        setIsLoadingScouts(true)
        try {
          const result = await getUnitScoutsForImport(currentUnit.id)
          if (result.success && result.data) {
            setScouts(result.data)

            // Try to auto-match the scout
            if (parsedData) {
              const matchResult = await findScoutByBsaIdOrName(
                currentUnit.id,
                parsedData.scout.bsaId,
                parsedData.scout.firstName,
                parsedData.scout.lastName
              )
              if (matchResult.success && matchResult.data) {
                setMatchedScout(matchResult.data)
                setSelectedScoutId(matchResult.data.id)
              }
            }
          } else if (!result.success) {
            setError(result.error || 'Failed to load scouts')
          }
        } finally {
          setIsLoadingScouts(false)
        }
      }
      loadScouts()
    }
  }, [step, currentUnit?.id, parsedData])

  const handleParsed = (data: ParsedScoutbookHistory) => {
    setParsedData(data)
    setError(null)
    setStep('select-scout')
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleScoutSelected = () => {
    if (!selectedScoutId) {
      setError('Please select a scout')
      return
    }
    setStep('preview')
  }

  const handleImport = async (selections: ImportSelections) => {
    if (!currentUnit?.id || !selectedScoutId || !parsedData) {
      setError('Missing required data')
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const response = await importScoutbookHistory(
        selectedScoutId,
        currentUnit.id,
        selections,
        parsedData.activities
      )

      if (!response.success) {
        setError(response.error || 'Import failed')
        setIsImporting(false)
        return
      }

      setResult(response.data || null)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleCancel = () => {
    if (step === 'preview') {
      setStep('select-scout')
    } else {
      setStep('upload')
      setParsedData(null)
      setMatchedScout(null)
      setSelectedScoutId(null)
    }
    setError(null)
  }

  const handleDone = () => {
    if (selectedScoutId) {
      router.push(`/scouts/${selectedScoutId}`)
    } else {
      router.push('/advancement')
    }
    router.refresh()
  }

  const handleStartOver = () => {
    setStep('upload')
    setParsedData(null)
    setResult(null)
    setError(null)
    setMatchedScout(null)
    setSelectedScoutId(null)
  }

  const summary = parsedData ? getScoutbookHistorySummary(parsedData) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings?tab=data">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-stone-900">Import Advancement History</h1>
        <p className="mt-1 text-stone-600">
          Import a scout&apos;s advancement data from a ScoutBook History Report
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-error bg-error-light">
          <CardContent className="pt-6">
            <p className="text-error">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload ScoutBook History
            </CardTitle>
            <CardDescription>
              Upload a ScoutBook History Report CSV for one scout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScoutbookHistoryUpload onParsed={handleParsed} onError={handleError} />

            <div className="mt-6 rounded-lg bg-stone-50 p-4">
              <h3 className="font-medium text-stone-900">How to export from ScoutBook:</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-stone-600">
                <li>Log in to scoutbook.scouting.org</li>
                <li>Select the scout&apos;s profile</li>
                <li>Click on &quot;Scouts BSA History&quot;</li>
                <li>Click the Export/Download button (CSV format)</li>
                <li>Upload the downloaded file here</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Scout */}
      {step === 'select-scout' && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Select Scout
            </CardTitle>
            <CardDescription>
              Choose which scout in your unit to import this data for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parsed Data Summary */}
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <h3 className="font-medium text-stone-900">File contains data for:</h3>
              <p className="mt-1 text-lg font-semibold">{summary?.scoutName}</p>
              {parsedData.scout.bsaId && (
                <p className="text-sm text-stone-500">BSA ID: {parsedData.scout.bsaId}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-stone-600">
                {summary && (
                  <>
                    <span>{summary.completedRanks} ranks completed</span>
                    <span>|</span>
                    <span>{summary.completedBadges} merit badges</span>
                    <span>|</span>
                    <span>{summary.leadershipPositions} positions</span>
                  </>
                )}
              </div>
            </div>

            {/* Match Status */}
            {matchedScout && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>
                  Auto-matched to <strong>{matchedScout.firstName} {matchedScout.lastName}</strong>
                  {matchedScout.bsaId && ` (BSA ID: ${matchedScout.bsaId})`}
                </span>
              </div>
            )}

            {!matchedScout && !isLoadingScouts && (
              <div className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-5 w-5" />
                <span>Could not auto-match scout. Please select manually.</span>
              </div>
            )}

            {/* Scout Selector */}
            <div className="space-y-2">
              <Label htmlFor="scout-select">Import data for:</Label>
              <Select
                value={selectedScoutId || ''}
                onValueChange={(value) => setSelectedScoutId(value)}
                disabled={isLoadingScouts}
              >
                <SelectTrigger id="scout-select">
                  <SelectValue placeholder={isLoadingScouts ? 'Loading scouts...' : 'Select a scout'} />
                </SelectTrigger>
                <SelectContent>
                  {scouts.map((scout) => (
                    <SelectItem key={scout.id} value={scout.id}>
                      {scout.firstName} {scout.lastName}
                      {scout.bsaId && ` (${scout.bsaId})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleScoutSelected} disabled={!selectedScoutId}>
                Continue to Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && parsedData && (
        <ScoutbookHistoryPreview
          data={parsedData}
          onImport={handleImport}
          onCancel={handleCancel}
          isImporting={isImporting}
        />
      )}

      {/* Step 4: Result */}
      {step === 'result' && result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-6 w-6" />
                Import Complete
              </CardTitle>
              <CardDescription>The advancement data has been imported successfully</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-stone-200 p-4">
                  <p className="text-2xl font-bold">{result.ranksImported}</p>
                  <p className="text-sm text-stone-500">Ranks imported</p>
                </div>
                <div className="rounded-lg border border-stone-200 p-4">
                  <p className="text-2xl font-bold">{result.requirementsImported}</p>
                  <p className="text-sm text-stone-500">Requirements completed</p>
                </div>
                <div className="rounded-lg border border-stone-200 p-4">
                  <p className="text-2xl font-bold">{result.badgesImported}</p>
                  <p className="text-sm text-stone-500">Merit badges imported</p>
                </div>
                <div className="rounded-lg border border-stone-200 p-4">
                  <p className="text-2xl font-bold">{result.leadershipImported}</p>
                  <p className="text-sm text-stone-500">Leadership positions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleStartOver}>
              Import Another File
            </Button>
            <Button onClick={handleDone}>View Scout Profile</Button>
          </div>
        </>
      )}
    </div>
  )
}
