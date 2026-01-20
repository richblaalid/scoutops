'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RosterUpload } from '@/components/import/roster-upload'
import { RosterPreview } from '@/components/import/roster-preview'
import { ImportProgress } from '@/components/import/import-progress'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { type ParsedRoster, type ParsedAdult, type ParsedScout } from '@/lib/import/bsa-roster-parser'

type ImportStep = 'upload' | 'preview' | 'result'

interface ImportResult {
  success: boolean
  adultsImported: number
  adultsUpdated: number
  scoutsImported: number
  scoutsUpdated: number
  guardiansLinked: number
  trainingsImported: number
  patrolsCreated: number
  errors: string[]
}

export default function ImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<ImportStep>('upload')
  const [roster, setRoster] = useState<ParsedRoster | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleParsed = (parsedRoster: ParsedRoster) => {
    setRoster(parsedRoster)
    setError(null)
    setStep('preview')
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleImport = async (adults: ParsedAdult[], scouts: ParsedScout[]) => {
    setIsImporting(true)
    setError(null)

    try {
      const response = await fetch('/api/import/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adults, scouts }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.errors?.[0] || 'Import failed')
        setIsImporting(false)
        return
      }

      setResult(data)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleCancel = () => {
    setStep('upload')
    setRoster(null)
    setError(null)
  }

  const handleDone = () => {
    router.push('/settings?tab=data')
    router.refresh()
  }

  const handleStartOver = () => {
    setStep('upload')
    setRoster(null)
    setResult(null)
    setError(null)
  }

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
        <h1 className="text-3xl font-bold text-stone-900">Import Roster</h1>
        <p className="mt-1 text-stone-600">
          Import scouts and adults from your BSA roster export
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

      {/* Step Content */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload BSA Roster
            </CardTitle>
            <CardDescription>
              Export your roster from my.scouting.org and upload the CSV file here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RosterUpload onParsed={handleParsed} onError={handleError} />

            <div className="mt-6 rounded-lg bg-stone-50 p-4">
              <h3 className="font-medium text-stone-900">How to export your roster:</h3>
              <ol className="mt-2 list-decimal pl-4 text-sm text-stone-600 space-y-1">
                <li>Log in to my.scouting.org</li>
                <li>Go to Unit &rarr; Roster</li>
                <li>Click the Export button and select CSV format</li>
                <li>Upload the downloaded file here</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && roster && (
        <RosterPreview
          roster={roster}
          onImport={handleImport}
          onCancel={handleCancel}
          isImporting={isImporting}
        />
      )}

      {step === 'result' && result && (
        <>
          <ImportProgress result={result} onDone={handleDone} />
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleStartOver}>
              Import Another Roster
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
