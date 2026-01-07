# ScoutOps Development Plan for Claude Code

> **Purpose:** This document provides step-by-step implementation guidance for building ScoutOps using Claude Code. Each phase includes specific tasks, file structures, database schemas, and code patterns.

---

## Project Overview

**ScoutOps** is a unit management platform for Scouting America troops. It provides financial tracking, event management, and advancement synchronization with Scoutbook.

**Core Philosophy:** "Scoutbook is for the Council; ScoutOps is for the Unit."

---

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 14+ (App Router) | React, TypeScript, Tailwind CSS |
| Backend | Supabase | PostgreSQL, Auth, Edge Functions, Storage |
| Payments | Square Web Payments SDK | Connect to existing troop Square account |
| Mobile (Phase 2) | Flutter + Drift | Offline-first with SQLite |
| Sync Agent (Phase 1) | Plasmo (Chrome Extension) | Manifest V3 |
| Hosting | Vercel + Supabase | Free tiers for pilot |
| Error Tracking | Sentry | Error tracking and performance |
| Analytics | PostHog | Product analytics, feature flags, session replay |
| CI/CD | GitHub Actions | Automated testing and deployment |

---

## Project Structure

```
scoutops/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── app/
│   │   │   ├── (auth)/         # Auth routes (login, callback)
│   │   │   ├── (dashboard)/    # Protected dashboard routes
│   │   │   │   ├── accounts/   # Scout account management
│   │   │   │   ├── events/     # Calendar and events
│   │   │   │   ├── billing/    # Fair share billing
│   │   │   │   ├── reports/    # Financial reports
│   │   │   │   └── settings/   # Unit settings
│   │   │   ├── api/
│   │   │   │   └── v1/         # API routes
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/             # Shadcn/ui components
│   │   │   ├── forms/          # Form components
│   │   │   └── dashboard/      # Dashboard-specific components
│   │   ├── lib/
│   │   │   ├── supabase/       # Supabase client utilities
│   │   │   ├── square/         # Square integration
│   │   │   ├── posthog/        # PostHog analytics
│   │   │   ├── accounting/     # Double-entry accounting logic
│   │   │   └── utils/          # General utilities
│   │   └── types/              # TypeScript types
│   ├── mobile/                 # Flutter app (Phase 2)
│   └── extension/              # Chrome extension (Phase 1)
├── packages/
│   └── database/               # Shared database types/schemas
├── supabase/
│   ├── migrations/             # Database migrations
│   ├── functions/              # Edge functions
│   └── seed.sql                # Seed data for development
├── .github/
│   └── workflows/              # CI/CD workflows
└── docs/                       # Documentation
```

---

## Database Schema

### Core Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORGANIZATION STRUCTURE
-- ============================================

-- Units (Troops/Packs)
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    unit_number VARCHAR(20) NOT NULL,
    unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('troop', 'pack', 'crew', 'ship')),
    council VARCHAR(255),
    district VARCHAR(255),
    chartered_org VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unit memberships (links users to units with roles)
CREATE TABLE unit_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'treasurer', 'leader', 'parent', 'scout')),
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, profile_id)
);

-- Scouts (youth members)
CREATE TABLE scouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    bsa_member_id VARCHAR(20),
    patrol VARCHAR(100),
    rank VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scout-Parent relationships
CREATE TABLE scout_guardians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    relationship VARCHAR(50) DEFAULT 'parent',
    is_primary BOOLEAN DEFAULT false,
    UNIQUE(scout_id, profile_id)
);

-- ============================================
-- FINANCIAL SYSTEM (Double-Entry Accounting)
-- ============================================

-- Chart of Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
        'asset', 'liability', 'equity', 'income', 'expense'
    )),
    parent_id UUID REFERENCES accounts(id),
    is_system BOOLEAN DEFAULT false,  -- System accounts can't be deleted
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, code)
);

-- Scout Individual Accounts (sub-ledger)
CREATE TABLE scout_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scout_id)
);

-- Journal Entries (transaction headers)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference VARCHAR(100),  -- Check number, receipt number, etc.
    entry_type VARCHAR(50),  -- payment, charge, transfer, adjustment
    is_posted BOOLEAN DEFAULT false,
    is_void BOOLEAN DEFAULT false,
    void_reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    posted_at TIMESTAMPTZ
);

-- Journal Entry Lines (debits and credits)
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    scout_account_id UUID REFERENCES scout_accounts(id),  -- Optional: tag to scout
    debit DECIMAL(10,2) DEFAULT 0.00,
    credit DECIMAL(10,2) DEFAULT 0.00,
    memo TEXT,
    CHECK (debit >= 0 AND credit >= 0),
    CHECK (NOT (debit > 0 AND credit > 0))  -- Can't have both on same line
);

-- ============================================
-- EVENTS & BILLING
-- ============================================

-- Events (campouts, meetings, etc.)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50),  -- campout, meeting, service, fundraiser
    location VARCHAR(255),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    cost_per_scout DECIMAL(10,2),
    cost_per_adult DECIMAL(10,2),
    max_participants INTEGER,
    rsvp_deadline TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event RSVPs
CREATE TABLE event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    scout_id UUID REFERENCES scouts(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- For adults
    status VARCHAR(20) NOT NULL CHECK (status IN ('going', 'not_going', 'maybe')),
    is_driver BOOLEAN DEFAULT false,
    vehicle_seats INTEGER,
    notes TEXT,
    responded_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (scout_id IS NOT NULL OR profile_id IS NOT NULL)
);

-- Fair Share Billing Records
CREATE TABLE billing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    billing_date DATE NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual charges from billing
CREATE TABLE billing_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_record_id UUID NOT NULL REFERENCES billing_records(id) ON DELETE CASCADE,
    scout_account_id UUID NOT NULL REFERENCES scout_accounts(id),
    amount DECIMAL(10,2) NOT NULL,
    is_paid BOOLEAN DEFAULT false
);

-- ============================================
-- PAYMENTS (Square Integration)
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    scout_account_id UUID REFERENCES scout_accounts(id),
    amount DECIMAL(10,2) NOT NULL,
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),  -- card, cash, check, transfer
    square_payment_id VARCHAR(255),
    square_receipt_url TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    journal_entry_id UUID REFERENCES journal_entries(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVENTORY TRACKING (Fundraising)
-- ============================================

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50),
    category VARCHAR(100),  -- popcorn, camp_cards, wreaths
    unit_cost DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    quantity_on_hand INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_checkouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    scout_id UUID NOT NULL REFERENCES scouts(id),
    quantity_out INTEGER NOT NULL,
    quantity_returned INTEGER DEFAULT 0,
    quantity_sold INTEGER DEFAULT 0,
    checked_out_at TIMESTAMPTZ DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    notes TEXT
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES profiles(id),
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can only see units they belong to
CREATE POLICY "Users can view their units" ON units
    FOR SELECT USING (
        id IN (
            SELECT unit_id FROM unit_memberships 
            WHERE profile_id = auth.uid() AND is_active = true
        )
    );

-- Users can only see scouts in their units
CREATE POLICY "Users can view scouts in their units" ON scouts
    FOR SELECT USING (
        unit_id IN (
            SELECT unit_id FROM unit_memberships 
            WHERE profile_id = auth.uid() AND is_active = true
        )
    );

-- Parents can only see their own scout's account details
CREATE POLICY "Parents can view own scout accounts" ON scout_accounts
    FOR SELECT USING (
        scout_id IN (
            SELECT scout_id FROM scout_guardians WHERE profile_id = auth.uid()
        )
        OR
        unit_id IN (
            SELECT unit_id FROM unit_memberships 
            WHERE profile_id = auth.uid() 
            AND role IN ('admin', 'treasurer', 'leader')
            AND is_active = true
        )
    );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_unit_memberships_profile ON unit_memberships(profile_id);
CREATE INDEX idx_unit_memberships_unit ON unit_memberships(unit_id);
CREATE INDEX idx_scouts_unit ON scouts(unit_id);
CREATE INDEX idx_scout_accounts_scout ON scout_accounts(scout_id);
CREATE INDEX idx_journal_entries_unit ON journal_entries(unit_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_events_unit ON events(unit_id);
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_payments_unit ON payments(unit_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update scout account balance after journal entry posted
CREATE OR REPLACE FUNCTION update_scout_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.scout_account_id IS NOT NULL THEN
        UPDATE scout_accounts
        SET balance = balance + (NEW.credit - NEW.debit),
            updated_at = NOW()
        WHERE id = NEW.scout_account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scout_balance
AFTER INSERT ON journal_lines
FOR EACH ROW
EXECUTE FUNCTION update_scout_account_balance();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_units_updated_at
BEFORE UPDATE ON units
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_scouts_updated_at
BEFORE UPDATE ON scouts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Default Chart of Accounts (Seed Data)

```sql
-- Seed default chart of accounts for new units
-- This would be called when a new unit is created

INSERT INTO accounts (unit_id, code, name, account_type, is_system) VALUES
-- Assets
('{{unit_id}}', '1000', 'Bank Account - Checking', 'asset', true),
('{{unit_id}}', '1010', 'Bank Account - Savings', 'asset', false),
('{{unit_id}}', '1100', 'Accounts Receivable', 'asset', true),
('{{unit_id}}', '1200', 'Scout Accounts Receivable', 'asset', true),
('{{unit_id}}', '1300', 'Inventory - Fundraising', 'asset', false),

-- Liabilities
('{{unit_id}}', '2000', 'Scout Account Balances', 'liability', true),
('{{unit_id}}', '2100', 'Accounts Payable', 'liability', false),

-- Income
('{{unit_id}}', '4000', 'Dues Income', 'income', true),
('{{unit_id}}', '4100', 'Camping Fees', 'income', true),
('{{unit_id}}', '4200', 'Fundraising Income - Popcorn', 'income', false),
('{{unit_id}}', '4210', 'Fundraising Income - Camp Cards', 'income', false),
('{{unit_id}}', '4300', 'Donations', 'income', false),
('{{unit_id}}', '4900', 'Other Income', 'income', false),

-- Expenses
('{{unit_id}}', '5000', 'Camping Expenses', 'expense', true),
('{{unit_id}}', '5100', 'Equipment & Supplies', 'expense', false),
('{{unit_id}}', '5200', 'Awards & Recognition', 'expense', true),
('{{unit_id}}', '5300', 'Training', 'expense', false),
('{{unit_id}}', '5400', 'Insurance', 'expense', false),
('{{unit_id}}', '5500', 'Charter Fees', 'expense', false),
('{{unit_id}}', '5600', 'Payment Processing Fees', 'expense', true),
('{{unit_id}}', '5900', 'Other Expenses', 'expense', false);
```

---

## Phase 0: Financial Core (MVP)

**Timeline:** 3-4 months  
**Goal:** Pilot troop treasurer actively using for all financial tracking

### Task 0.1: Project Setup

```bash
# Create Next.js app with TypeScript
npx create-next-app@latest scoutops-web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd scoutops-web

# Install core dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod
npm install date-fns
npm install lucide-react
npm install @sentry/nextjs
npm install posthog-js posthog-node

# Install shadcn/ui
npx shadcn-ui@latest init

# Add commonly used components
npx shadcn-ui@latest add button card input label table dialog alert toast tabs form select checkbox
```

### Task 0.2: Supabase Configuration

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  )
}
```

Create `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => 
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated and trying to access dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### Task 0.3: PostHog Analytics Setup

PostHog provides product analytics, feature flags, and session replay. Free tier includes 1M events/month.

Create `lib/posthog/client.ts`:

```typescript
import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window !== 'undefined' && !posthog.__loaded) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll handle this manually for more control
      capture_pageleave: true,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          // Disable in development to avoid polluting data
          posthog.opt_out_capturing()
        }
      },
    })
  }
  return posthog
}

export { posthog }
```

Create `lib/posthog/server.ts`:

```typescript
import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

export function getPostHogServer() {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1, // Flush immediately for serverless
      flushInterval: 0,
    })
  }
  return posthogClient
}
```

Create `components/providers/posthog-provider.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/posthog/client'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPostHog()
  }, [])

  // Track page views
  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', { '$current_url': url })
    }
  }, [pathname, searchParams])

  return <>{children}</>
}
```

Create `lib/posthog/events.ts` (centralized event definitions):

```typescript
import { posthog } from './client'

// ============================================
// FINANCIAL EVENTS
// ============================================

export const trackPaymentInitiated = (params: {
  scoutId: string
  amount: number
  paymentMethod: string
}) => {
  posthog.capture('payment_initiated', params)
}

export const trackPaymentCompleted = (params: {
  scoutId: string
  amount: number
  paymentMethod: string
  processingFee: number
}) => {
  posthog.capture('payment_completed', params)
}

export const trackPaymentFailed = (params: {
  scoutId: string
  amount: number
  errorMessage: string
}) => {
  posthog.capture('payment_failed', params)
}

export const trackFairShareBillingCreated = (params: {
  eventId?: string
  totalAmount: number
  scoutCount: number
  amountPerScout: number
}) => {
  posthog.capture('fair_share_billing_created', params)
}

// ============================================
// USER EVENTS  
// ============================================

export const trackUserLogin = (params: {
  userId: string
  role: string
  unitId: string
}) => {
  posthog.identify(params.userId, {
    role: params.role,
    unitId: params.unitId,
  })
  posthog.capture('user_logged_in', params)
}

export const trackUserLogout = () => {
  posthog.capture('user_logged_out')
  posthog.reset()
}

// ============================================
// FEATURE USAGE EVENTS
// ============================================

export const trackFeatureUsed = (featureName: string, metadata?: Record<string, any>) => {
  posthog.capture('feature_used', {
    feature: featureName,
    ...metadata,
  })
}

export const trackReportGenerated = (params: {
  reportType: string
  dateRange?: string
}) => {
  posthog.capture('report_generated', params)
}

// ============================================
// ERROR EVENTS (supplement Sentry)
// ============================================

export const trackError = (params: {
  errorType: string
  errorMessage: string
  context?: Record<string, any>
}) => {
  posthog.capture('error_occurred', params)
}
```

Add PostHogProvider to `app/layout.tsx`:

```typescript
import { PostHogProvider } from '@/components/providers/posthog-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}
```

**Key Events to Track (Phase 0):**

| Event | When | Why |
|-------|------|-----|
| `payment_initiated` | User clicks Pay button | Measure payment funnel start |
| `payment_completed` | Square confirms payment | Measure conversion rate |
| `payment_failed` | Payment errors | Identify UX issues |
| `fair_share_billing_created` | Treasurer creates billing | Core feature usage |
| `report_generated` | Any report viewed | Understand report value |
| `user_logged_in` | After auth callback | Track active users |
| `feature_used` | Various UI interactions | Identify popular features |

### Task 0.4: Authentication (Magic Links)

Create `app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ 
        type: 'success', 
        text: 'Check your email for the login link!' 
      })
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">ScoutOps</CardTitle>
          <CardDescription>
            Sign in with your email to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send Magic Link
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

Create `app/(auth)/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

### Task 0.5: Scout Account Ledger Component

Create `components/dashboard/scout-account-card.tsx`:

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

interface ScoutAccountCardProps {
  scout: {
    id: string
    first_name: string
    last_name: string
    patrol?: string
  }
  balance: number
  recentTransactions?: Array<{
    id: string
    date: string
    description: string
    amount: number
  }>
}

export function ScoutAccountCard({ scout, balance, recentTransactions = [] }: ScoutAccountCardProps) {
  const isNegative = balance < 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">
          {scout.first_name} {scout.last_name}
        </CardTitle>
        {scout.patrol && (
          <Badge variant="outline">{scout.patrol}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(balance)}
        </div>
        <p className="text-xs text-muted-foreground">
          {isNegative ? 'Amount owed' : 'Available balance'}
        </p>
        
        {recentTransactions.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Recent Activity</h4>
            {recentTransactions.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[200px]">
                  {tx.description}
                </span>
                <span className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Task 0.6: Fair Share Billing Form

Create `components/forms/fair-share-billing-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

const billingSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  totalAmount: z.number().positive('Amount must be positive'),
  billingDate: z.string(),
  selectedScouts: z.array(z.string()).min(1, 'Select at least one scout'),
})

type BillingFormData = z.infer<typeof billingSchema>

interface Scout {
  id: string
  first_name: string
  last_name: string
  scout_account_id: string
}

interface FairShareBillingFormProps {
  scouts: Scout[]
  eventId?: string
  onSubmit: (data: BillingFormData & { amountPerScout: number }) => Promise<void>
}

export function FairShareBillingForm({ scouts, eventId, onSubmit }: FairShareBillingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const form = useForm<BillingFormData>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      description: '',
      totalAmount: 0,
      billingDate: new Date().toISOString().split('T')[0],
      selectedScouts: [],
    },
  })

  const watchedAmount = form.watch('totalAmount')
  const watchedScouts = form.watch('selectedScouts')
  
  const amountPerScout = watchedScouts.length > 0 
    ? watchedAmount / watchedScouts.length 
    : 0

  const handleSubmit = async (data: BillingFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit({ ...data, amountPerScout })
      form.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleAllScouts = (checked: boolean) => {
    if (checked) {
      form.setValue('selectedScouts', scouts.map(s => s.id))
    } else {
      form.setValue('selectedScouts', [])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fair Share Billing</CardTitle>
        <CardDescription>
          Split expenses equally among selected scouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Summer Camp Food"
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register('totalAmount', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingDate">Billing Date</Label>
              <Input
                id="billingDate"
                type="date"
                {...form.register('billingDate')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Scouts</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="selectAll"
                  onCheckedChange={toggleAllScouts}
                  checked={watchedScouts.length === scouts.length}
                />
                <label htmlFor="selectAll" className="text-sm">
                  Select All
                </label>
              </div>
            </div>

            <div className="grid gap-2 max-h-60 overflow-y-auto border rounded-md p-4">
              {scouts.map((scout) => (
                <div key={scout.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={scout.id}
                    checked={watchedScouts.includes(scout.id)}
                    onCheckedChange={(checked) => {
                      const current = form.getValues('selectedScouts')
                      if (checked) {
                        form.setValue('selectedScouts', [...current, scout.id])
                      } else {
                        form.setValue('selectedScouts', current.filter(id => id !== scout.id))
                      }
                    }}
                  />
                  <label htmlFor={scout.id} className="text-sm">
                    {scout.first_name} {scout.last_name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {watchedScouts.length > 0 && watchedAmount > 0 && (
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm">
                <strong>{watchedScouts.length}</strong> scouts selected
              </p>
              <p className="text-lg font-bold">
                {formatCurrency(amountPerScout)} per scout
              </p>
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Processing...' : 'Create Billing'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### Task 0.7: Square Payment Integration

Create `lib/square/client.ts`:

```typescript
import { Client, Environment } from 'square'

export const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'production' 
    ? Environment.Production 
    : Environment.Sandbox,
})

export const { paymentsApi, customersApi } = squareClient
```

Create `app/api/v1/payments/create-payment/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentsApi } from '@/lib/square/client'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sourceId, amount, scoutAccountId, unitId, note } = body

    // Amount should be in cents for Square
    const amountInCents = Math.round(amount * 100)

    const { result } = await paymentsApi.createPayment({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(amountInCents),
        currency: 'USD',
      },
      note: note || 'ScoutOps Payment',
    })

    if (result.payment) {
      const payment = result.payment
      const feeAmount = Number(payment.processingFee?.[0]?.amountMoney?.amount || 0) / 100
      const netAmount = amount - feeAmount

      // Record payment in database
      const { data: paymentRecord, error: dbError } = await supabase
        .from('payments')
        .insert({
          unit_id: unitId,
          scout_account_id: scoutAccountId,
          amount: amount,
          fee_amount: feeAmount,
          net_amount: netAmount,
          payment_method: 'card',
          square_payment_id: payment.id,
          square_receipt_url: payment.receiptUrl,
          status: payment.status?.toLowerCase(),
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        // Payment succeeded but DB failed - log for manual reconciliation
      }

      // Create journal entry for the payment
      await createPaymentJournalEntry(supabase, {
        unitId,
        scoutAccountId,
        amount,
        feeAmount,
        description: note || 'Card payment',
        paymentId: paymentRecord?.id,
      })

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        receiptUrl: payment.receiptUrl,
      })
    }

    return NextResponse.json({ error: 'Payment failed' }, { status: 400 })
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    )
  }
}

async function createPaymentJournalEntry(
  supabase: any,
  params: {
    unitId: string
    scoutAccountId: string
    amount: number
    feeAmount: number
    description: string
    paymentId?: string
  }
) {
  const { unitId, scoutAccountId, amount, feeAmount, description, paymentId } = params

  // Get account IDs for this unit
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('unit_id', unitId)
    .in('code', ['1000', '2000', '5600']) // Bank, Scout Accounts, Processing Fees

  const bankAccount = accounts?.find((a: any) => a.code === '1000')
  const scoutLiabilityAccount = accounts?.find((a: any) => a.code === '2000')
  const feeExpenseAccount = accounts?.find((a: any) => a.code === '5600')

  if (!bankAccount || !scoutLiabilityAccount) {
    console.error('Required accounts not found')
    return
  }

  // Create journal entry
  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      unit_id: unitId,
      entry_date: new Date().toISOString().split('T')[0],
      description: description,
      entry_type: 'payment',
      is_posted: true,
      posted_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (entryError || !entry) {
    console.error('Failed to create journal entry:', entryError)
    return
  }

  // Create journal lines
  const netAmount = amount - feeAmount
  const lines = [
    // Debit Bank (increase asset) for net amount
    {
      journal_entry_id: entry.id,
      account_id: bankAccount.id,
      debit: netAmount,
      credit: 0,
      memo: 'Net deposit after fees',
    },
    // Credit Scout Account liability (decrease what they owe)
    {
      journal_entry_id: entry.id,
      account_id: scoutLiabilityAccount.id,
      scout_account_id: scoutAccountId,
      debit: 0,
      credit: amount,
      memo: `Payment from scout`,
    },
  ]

  // Add fee expense if applicable
  if (feeAmount > 0 && feeExpenseAccount) {
    lines.push({
      journal_entry_id: entry.id,
      account_id: feeExpenseAccount.id,
      debit: feeAmount,
      credit: 0,
      memo: 'Square processing fee',
    })
  }

  await supabase.from('journal_lines').insert(lines)

  // Link journal entry to payment record
  if (paymentId) {
    await supabase
      .from('payments')
      .update({ journal_entry_id: entry.id })
      .eq('id', paymentId)
  }
}
```

Create `components/forms/payment-form.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

declare global {
  interface Window {
    Square: any
  }
}

interface PaymentFormProps {
  scoutAccountId: string
  scoutName: string
  unitId: string
  currentBalance: number
  onSuccess: () => void
}

export function PaymentForm({ 
  scoutAccountId, 
  scoutName, 
  unitId, 
  currentBalance,
  onSuccess 
}: PaymentFormProps) {
  const [card, setCard] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)

  useEffect(() => {
    // Load Square Web Payments SDK
    const script = document.createElement('script')
    script.src = 'https://sandbox.web.squarecdn.com/v1/square.js' // Use production URL in prod
    script.onload = () => setSdkLoaded(true)
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!sdkLoaded) return

    async function initializeCard() {
      const payments = window.Square.payments(
        process.env.NEXT_PUBLIC_SQUARE_APP_ID,
        process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
      )

      const card = await payments.card()
      await card.attach('#card-container')
      setCard(card)
    }

    initializeCard()
  }, [sdkLoaded])

  const handlePayment = async () => {
    if (!card || !amount) return

    setLoading(true)
    setError(null)

    try {
      const result = await card.tokenize()
      
      if (result.status === 'OK') {
        const response = await fetch('/api/v1/payments/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: result.token,
            amount: parseFloat(amount),
            scoutAccountId,
            unitId,
            note: `Payment for ${scoutName}`,
          }),
        })

        const data = await response.json()

        if (data.success) {
          onSuccess()
        } else {
          setError(data.error || 'Payment failed')
        }
      } else {
        setError('Card validation failed')
      }
    } catch (err) {
      setError('An error occurred processing your payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make a Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Paying for: {scoutName}</p>
          {currentBalance < 0 && (
            <p className="text-sm font-medium text-red-600">
              Current balance: ${Math.abs(currentBalance).toFixed(2)} owed
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.50"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Card Details</Label>
          <div 
            id="card-container" 
            className="border rounded-md p-3 min-h-[50px]"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handlePayment} 
          disabled={loading || !card || !amount}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${amount || '0.00'}`
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Payments processed securely by Square
        </p>
      </CardContent>
    </Card>
  )
}
```

### Task 0.8: Reports

Create `app/(dashboard)/reports/account-statements/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { AccountStatementReport } from '@/components/reports/account-statement-report'

export default async function AccountStatementsPage() {
  const supabase = await createClient()
  
  // Get user's unit
  const { data: { user } } = await supabase.auth.getUser()
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', user?.id)
    .single()

  if (!membership || !['admin', 'treasurer'].includes(membership.role)) {
    return <div>Access denied</div>
  }

  // Get all scouts with their account balances and recent transactions
  const { data: scoutsWithAccounts } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      patrol,
      scout_accounts (
        id,
        balance
      )
    `)
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .order('last_name')

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Account Statements</h1>
      <AccountStatementReport scouts={scoutsWithAccounts || []} />
    </div>
  )
}
```

### Task 0.9: Environment Variables

Create `.env.local.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Square
NEXT_PUBLIC_SQUARE_APP_ID=your_square_app_id
NEXT_PUBLIC_SQUARE_LOCATION_ID=your_square_location_id
SQUARE_ACCESS_TOKEN=your_square_access_token

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Sentry
SENTRY_DSN=your_sentry_dsn

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Task 0.10: Testing Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

---

## Phase 1: Calendar & Sync (Abbreviated)

**Timeline:** +2-3 months after Phase 0  
**Prerequisite:** Phase 0 complete and in production use

### Key Tasks

1. **Event Calendar Component** - Build full-featured calendar with RSVP
2. **Driver Calculus** - Calculate available seats based on RSVPs
3. **Sync Agent Chrome Extension** - Read-only sync from Scoutbook
4. **Canary Testing Infrastructure** - Automated testing of Scoutbook DOM

### Extension Setup (Plasmo)

```bash
npm create plasmo@latest scoutops-extension -- --with-src
cd scoutops-extension
npm install
```

---

## Phase 2: Full Sync & Mobile (Abbreviated)

**Timeline:** +3-4 months after Phase 1  
**Prerequisite:** Phase 1 complete

### Key Tasks

1. **Bi-directional Sync** - Write advancement data to Scoutbook
2. **Flutter Mobile App** - Offline-first with Drift/SQLite
3. **QR Sign-off** - Quick requirement approval via QR codes
4. **Medical Info Caching** - Secure local storage with encryption

---

## Phase 3: Communication (Abbreviated)

**Timeline:** Post-validation  
**Prerequisite:** Core value proposition proven

### Key Tasks

1. **Evaluate Chat SDK** - Stream Chat vs SendBird vs Supabase Realtime
2. **YP Compliance Middleware** - Auto-CC parents on youth messages
3. **SMS Broadcasting** - Twilio integration for urgent alerts

---

## Development Commands Reference

```bash
# Development
npm run dev                    # Start Next.js dev server
npm run build                  # Production build
npm run lint                   # Run ESLint
npm run test                   # Run tests
npm run test:watch             # Run tests in watch mode

# Database
npx supabase start             # Start local Supabase
npx supabase db push           # Push migrations
npx supabase gen types ts      # Generate TypeScript types

# Deployment
vercel                         # Deploy to Vercel
vercel --prod                  # Deploy to production
```

---

## Git Workflow

```bash
# Branch naming
feature/phase0-scout-accounts
feature/phase0-fair-share-billing
fix/payment-processing-error
chore/update-dependencies

# Commit message format
feat: add scout account ledger component
fix: correct balance calculation in fair share billing
docs: update API documentation
chore: upgrade dependencies
```

---

## Definition of Done (Phase 0)

- [ ] Treasurer can log in via magic link
- [ ] Treasurer can view all scout account balances
- [ ] Treasurer can create fair share billing for events
- [ ] Parents can view their scout's account balance
- [ ] Parents can make payments via Square
- [ ] Transaction fees are automatically tracked
- [ ] Account statements can be generated
- [ ] All financial data is audit-logged
- [ ] Tests pass with >80% coverage on financial logic
- [ ] Deployed to production on Vercel + Supabase
- [ ] Sentry error tracking configured
- [ ] PostHog analytics tracking key events (payments, billing, logins)
- [ ] Pilot troop treasurer using daily for 2+ weeks
