'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, AlertCircle, Users, UserCheck, Link2, GraduationCap } from 'lucide-react'

interface ImportResult {
  success: boolean
  adultsImported: number
  adultsUpdated: number
  scoutsImported: number
  scoutsUpdated: number
  guardiansLinked: number
  trainingsImported: number
  errors: string[]
}

interface ImportProgressProps {
  result: ImportResult
  onDone: () => void
}

export function ImportProgress({ result, onDone }: ImportProgressProps) {
  const hasErrors = result.errors.length > 0
  const totalImported = result.adultsImported + result.scoutsImported
  const totalUpdated = result.adultsUpdated + result.scoutsUpdated

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card className={result.success ? 'border-success bg-success-light' : 'border-error bg-error-light'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${result.success ? 'text-success' : 'text-error'}`}>
            {result.success ? (
              <>
                <CheckCircle2 className="h-6 w-6" />
                Import Complete
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6" />
                Import Completed with Errors
              </>
            )}
          </CardTitle>
          <CardDescription className={result.success ? 'text-success' : 'text-error'}>
            {totalImported} new records imported, {totalUpdated} records updated
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Adults
            </CardDescription>
            <CardTitle className="text-2xl">
              {result.adultsImported + result.adultsUpdated}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">
              {result.adultsImported} new, {result.adultsUpdated} updated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Scouts
            </CardDescription>
            <CardTitle className="text-2xl">
              {result.scoutsImported + result.scoutsUpdated}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">
              {result.scoutsImported} new, {result.scoutsUpdated} updated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Guardian Links
            </CardDescription>
            <CardTitle className="text-2xl">{result.guardiansLinked}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">
              Parent-scout connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Trainings
            </CardDescription>
            <CardTitle className="text-2xl">{result.trainingsImported}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">
              Training records imported
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Errors */}
      {hasErrors && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Errors ({result.errors.length})
            </CardTitle>
            <CardDescription>
              Some records could not be imported
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {result.errors.map((error, i) => (
                <li key={i} className="text-stone-600">
                  {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Done Button */}
      <div className="flex justify-end">
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}
