'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrailMarker } from '@/components/ui/trail-marker'
import { SuccessCelebration } from '@/components/ui/success-animation'
import { FadeIn } from '@/components/ui/page-transition'
import { Button } from '@/components/ui/button'
import { completeSetupWizard } from '@/app/actions/onboarding'
import { Users, Building2, ArrowRight, Loader2, CheckCircle } from 'lucide-react'

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'review', label: 'Review' },
  { id: 'complete', label: 'Done' },
]

interface SetupWizardProps {
  unitId: string
  unitName: string
  unitType: string
  council: string | null
  rosterSummary: {
    adultCount: number
    scoutCount: number
    patrolCount: number
    patrols: string[]
  }
}

export function SetupWizard({
  unitId,
  unitName,
  unitType,
  council,
  rosterSummary,
}: SetupWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    const result = await completeSetupWizard()
    if (result.success) {
      setShowCelebration(true)
      setCurrentStep(2)
    }
    setIsCompleting(false)
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  // ============================================
  // Step 0: Welcome
  // ============================================

  const renderWelcomeStep = () => (
    <FadeIn className="text-center space-y-8">
      <div className="relative">
        <SuccessCelebration
          show={true}
          message={`Welcome to ${unitName}!`}
          subMessage="Your unit has been created and your roster imported."
        />
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 text-center">
          <p className="text-2xl font-bold text-forest-700 dark:text-forest-300">{rosterSummary.scoutCount}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">Scouts</p>
        </div>
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 text-center">
          <p className="text-2xl font-bold text-forest-700 dark:text-forest-300">{rosterSummary.adultCount}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">Adults</p>
        </div>
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 text-center">
          <p className="text-2xl font-bold text-forest-700 dark:text-forest-300">{rosterSummary.patrolCount}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">Patrols</p>
        </div>
      </div>

      <Button onClick={() => setCurrentStep(1)} size="lg" className="min-w-[200px]">
        Continue Setup
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </FadeIn>
  )

  // ============================================
  // Step 1: Review
  // ============================================

  const renderReviewStep = () => (
    <FadeIn className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-forest-800 dark:text-forest-200 mb-2">
          Review Your Unit
        </h2>
        <p className="text-stone-600 dark:text-stone-300">
          Here&apos;s what we imported from your roster. You can update these later from the Settings page.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Unit Info */}
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-forest-100 dark:bg-forest-900 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-forest-600 dark:text-forest-400" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100">{unitName}</h3>
              {council && (
                <p className="text-sm text-stone-500 dark:text-stone-400">{council}</p>
              )}
            </div>
          </div>
          <div className="text-sm text-stone-600 dark:text-stone-300">
            <p>Unit Type: {unitType.charAt(0).toUpperCase() + unitType.slice(1)}</p>
          </div>
        </div>

        {/* Roster Summary */}
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-forest-100 dark:bg-forest-900 flex items-center justify-center">
              <Users className="h-5 w-5 text-forest-600 dark:text-forest-400" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100">Roster</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">Imported from BSA</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-stone-600 dark:text-stone-300">
            <p>{rosterSummary.scoutCount} scouts imported</p>
            <p>{rosterSummary.adultCount} adults imported</p>
            {rosterSummary.patrolCount > 0 && (
              <p>{rosterSummary.patrolCount} patrols: {rosterSummary.patrols.join(', ')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Next Steps Preview */}
      <div className="rounded-lg border border-tan-200 dark:border-tan-800 bg-tan-50 dark:bg-tan-900/20 p-6">
        <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-3">What&apos;s next?</h3>
        <ul className="space-y-2 text-sm text-stone-600 dark:text-stone-300">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Invite other leaders to help manage the unit</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Set up billing and create your first fair share bill</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Connect payment processing to collect payments online</span>
          </li>
        </ul>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={() => setCurrentStep(0)}>
          Back
        </Button>
        <Button onClick={handleComplete} disabled={isCompleting} size="lg">
          {isCompleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finishing...
            </>
          ) : (
            <>
              Complete Setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </FadeIn>
  )

  // ============================================
  // Step 2: Complete
  // ============================================

  const renderCompleteStep = () => (
    <FadeIn className="text-center space-y-8">
      {showCelebration && (
        <SuccessCelebration
          show={true}
          message="You're all set!"
          subMessage="Your unit is ready to go."
        />
      )}

      <div className="space-y-4 pt-8">
        <h2 className="text-2xl font-bold text-forest-800 dark:text-forest-200">
          Setup Complete
        </h2>
        <p className="text-stone-600 dark:text-stone-300 max-w-md mx-auto">
          You can now start managing your unit. Explore the dashboard to invite leaders,
          create bills, and track scout accounts.
        </p>
      </div>

      <Button onClick={handleGoToDashboard} size="lg" className="min-w-[200px]">
        Go to Dashboard
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </FadeIn>
  )

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="flex justify-center">
        <TrailMarker steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-stone-800 rounded-xl border border-cream-400 dark:border-stone-700 p-8 shadow-lg">
        {currentStep === 0 && renderWelcomeStep()}
        {currentStep === 1 && renderReviewStep()}
        {currentStep === 2 && renderCompleteStep()}
      </div>
    </div>
  )
}
