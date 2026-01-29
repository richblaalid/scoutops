import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Empty chuck box illustration - compartments are empty/open
function EmptyChuckBox() {
  return (
    <svg
      viewBox="0 0 120 100"
      width={180}
      height={150}
      className="mx-auto"
    >
      {/* Main box body */}
      <path
        d="M100 15H20C16.5 15 14 17.5 14 21V55C14 58.5 16.5 61 20 61H100C103.5 61 106 58.5 106 55V21C106 17.5 103.5 15 100 15Z"
        fill="#234D3E"
      />
      {/* Left leg */}
      <path d="M25 60L12 90" stroke="#234D3E" strokeWidth="6" strokeLinecap="round"/>
      {/* Right leg */}
      <path d="M95 60L108 90" stroke="#234D3E" strokeWidth="6" strokeLinecap="round"/>
      {/* Work surface (amber bar) */}
      <path
        d="M102 64H18C16.5 64 15 65.5 15 67V72C15 73.5 16.5 75 18 75H102C103.5 75 105 73.5 105 72V67C105 65.5 103.5 64 102 64Z"
        fill="#b45309"
      />

      {/* Empty compartments with dashed outlines */}
      {/* Top right compartment - empty */}
      <rect x="65" y="20" width="35" height="15" rx="2" fill="none" stroke="#52A07E" strokeWidth="2" strokeDasharray="4 2"/>
      {/* Bottom right compartment - empty */}
      <rect x="65" y="40" width="35" height="15" rx="2" fill="none" stroke="#52A07E" strokeWidth="2" strokeDasharray="4 2"/>
      {/* Left compartment - empty with question mark */}
      <rect x="20" y="20" width="40" height="35" rx="2" fill="none" stroke="#52A07E" strokeWidth="2" strokeDasharray="4 2"/>

      {/* Question mark in the big compartment */}
      <text x="40" y="44" fontSize="24" fontWeight="bold" fill="#52A07E" textAnchor="middle">?</text>

      {/* Center divider */}
      <path d="M60 18V58" stroke="#3D8B6A" strokeWidth="2"/>

      {/* Magnifying glass searching */}
      <circle cx="95" cy="12" r="10" fill="none" stroke="#b45309" strokeWidth="3"/>
      <path d="M102 19L112 29" stroke="#b45309" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

export default function NotFound() {
  return (
    <div className="flex min-h-[500px] items-center justify-center p-4">
      <div className="max-w-md text-center">
        <EmptyChuckBox />

        <h1 className="mt-6 text-2xl font-bold text-forest-800">
          Hmm, this compartment&apos;s empty
        </h1>

        <p className="mt-3 text-lg text-stone-600">
          We searched the whole ChuckBox, but couldn&apos;t find what you&apos;re looking for.
        </p>

        <p className="mt-4 text-sm text-stone-500">
          The page may have been moved, deleted, or perhaps it wandered off on a nature hike.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">Back to Camp</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/scouts">Find Your Scouts</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
