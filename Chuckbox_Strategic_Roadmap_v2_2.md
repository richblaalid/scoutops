# **Strategic Product Roadmap: "Chuckbox" â€“ A Next-Generation Unit Management Platform for Scouting America**

**Version 2.2 â€” Revised January 2026**

---

## **1. Executive Summary**

The ecosystem of unit management software for Scouting America (formerly Boy Scouts of America) is currently characterized by significant fragmentation, user friction, and a widening gap between official compliance tools and the operational realities of volunteer leaders. The incumbent platform, **Scoutbook**, serves as the mandatory database of record for advancement and membership data, yet it struggles to provide a cohesive or comprehensive user experience for day-to-day unit administration. As Scouting America transitions its digital infrastructure from legacy systems to the modern **Scoutbook Plus (Internet Advancement 2.0)** architecture, users are forced to navigate a bifurcated environment that splits essential functions across disparate interfaces. This transition periodâ€”marked by feature migration delays, permission management complexities, and persistent synchronization latencyâ€”has created a volatile market environment ripe for a sophisticated challenger platform.

This report presents a comprehensive product plan for **Chuckbox**, a proposed third-party companion platform designed to displace existing competitors and relegate Scoutbook to a background compliance utility. The analysis draws upon an exhaustive review of current market offerings, including **TroopWebHost**, **TroopTrack**, **Scout Manager**, and **TroopMaster**, identifying critical unsatisfied requirements in financial fund accounting, offline mobile utility, and automated data synchronization.

The central thesis of this product roadmap is that a competitor cannot succeed by attempting to replace Scoutbook's role as the official record, as this is mandated by national policy. Instead, the winning strategy lies in capturing the "Unit Operating System"â€”the financial, logistical, and communicative workflows that Scoutbook ignores or under-servesâ€”while utilizing browser-based automation to bridge the data silo, thereby eliminating the "double-entry" burden that currently plagues volunteer leaders.

### **1.1 Development Approach**

Chuckbox will initially be developed for private use and testing with a single troop. This pilot phase will validate product-market fit and refine the feature set before broader distribution. Monetization decisions will follow successful validation, with a likely subscription model based on active Scouts per unit.

### **1.2 MVP Phasing Strategy**

To avoid scope creep and ship usable software quickly, development is organized into distinct phases:

| Phase | Scope | Timeline | Success Criteria |
|-------|-------|----------|------------------|
| **Phase 0: Financial Core** | Scout Accounts, Event Billing, Basic Reporting | 3-4 months | Pilot troop treasurer actively using for all financial tracking |
| **Phase 1: Calendar & Sync** | Calendar + RSVP + Read-Only Sync Agent | +2-3 months | Leaders can see advancement data pulled from Scoutbook |
| **Phase 2: Full Sync & Mobile** | Bi-directional Sync Agent + Offline Mobile App | +3-4 months | Leaders can mark requirements in Chuckbox and see them sync to Scoutbook |
| **Phase 3: Communication** | YP-Compliant Chat + SMS Broadcasting | Post-validation | Defer until core value proposition proven |

**Phase 0 Deliverables (MVP):**
- Web dashboard for Treasurer and Committee Chair
- Scout account ledger with balance tracking
- Event cost allocation ("Fair Share" billing)
- Payment collection via Square (using existing troop account)
- Basic reporting (account statements, transaction history)
- Parent portal to view Scout account balance

**Explicit Deferrals:**
- Chat/messaging system (use existing GroupMe/WhatsApp until Phase 3)
- Public website features (out of scope permanently)
- Merit badge counselor directory (use Scoutbook)
- Training record tracking (use Scoutbook)

---

## **2. Market Landscape and Strategic Context**

### **2.1 Market Size & Revenue Opportunity**

Based on current Scouting America data, the total addressable market is substantial:

| Metric | Value | Source |
|--------|-------|--------|
| Total Youth Members (2023) | ~1.1 million | BSA 2023 Annual Report |
| Cub Scout Youth | 574,365 | BSA 2023 Data |
| Scouts BSA Youth | 392,275 | BSA 2023 Data |
| Venturing/Sea Scouts | 14,961 | BSA 2023 Data |
| Total Units (Troops + Packs) | ~150,000 | Industry estimates |
| Local Councils | 300+ | BSA National Council |
| Average Troop Size | 24-35 Scouts | Industry norm |

**Competitive Pricing Benchmarks:**
- TroopWebHost: $109/year (flat per-unit)
- TroopTrack: $99/year or $10/month (flat per-unit)
- Scoutbook: Free (but limited functionality)

**Revenue Model (TBD):** Per-active-Scout subscription. At ~$3-5/Scout/year for a typical troop of 25 Scouts, this yields $75-125/year per unitâ€”competitive with existing players while scaling with unit size.

**Revenue Scenarios:**

| Market Penetration | Units | Avg Revenue/Unit | Annual Revenue |
|--------------------|-------|------------------|----------------|
| 1% of units | 1,500 | $100 | $150,000 |
| 5% of units | 7,500 | $100 | $750,000 |
| 10% of units | 15,000 | $100 | $1.5M |

**Market Dynamics:**

*Tailwinds:*
- Scoutbook transition chaos creating user frustration
- No dominant third-party player (fragmented market)
- "Family Troops" (coed) launching December 2025 may increase complexity for units

*Headwinds:*
- Overall BSA membership declining (~2.4% projected loss in 2024)
- Volunteer leaders are cost-sensitive and change-averse
- High switching costs due to historical data in existing platforms

### **2.2 The "Official Record" vs. "Unit Operations" Dichotomy**

To understand the competitive opportunity, one must first delineate the distinct roles played by software in the Scouting ecosystem. The market is fundamentally divided between the **Database of Record** and **Unit Operations Software**.

**Scoutbook**, acquired by the BSA in 2015, functions primarily as the Database of Record. Its core value proposition is compliance: it is the only platform where rank advancement, merit badges, and training records are officially recognized by the National Council. Data entered here flows into the organization's central membership databases, influencing everything from Journey to Excellence (JTE) scores to Eagle Scout verification. Because of this monopoly on official data, Scoutbook enjoys a captured user base; units *must* interact with it to some degree to ensure their youth are properly credited for their achievements.

However, the operational needs of a Scouting unit extend far beyond advancement tracking. A typical Troop or Pack operates as a small non-profit entity, managing annual budgets often exceeding $20,000, maintaining inventories of camping equipment, coordinating complex logistics for monthly expeditions, and communicating with dozens of families. **Unit Operations Software** fills the vacuum left by Scoutbook's limited scope. Competitors like **TroopWebHost** and **TroopTrack** have thrived by offering robust tools for these "back-office" functionsâ€”specifically detailed fund accounting and website hostingâ€”that Scoutbook either lacks entirely or implements poorly.

### **2.3 The Transition Crisis: Legacy vs. Scoutbook Plus**

The current moment represents a unique strategic window due to the chaotic state of Scoutbook's internal architecture. Scouting America is in the midst of a multi-year migration from the original "Legacy Scoutbook" (built on ColdFusion) to "Scoutbook Plus" (formerly Internet Advancement 2.0, built on a modern stack). This transition has not been seamless. Instead of a hard cutover, the organization has adopted a piecemeal migration strategy where specific features move to the new interface while others remain in the old one.

Currently, this results in a disjointed user experience where a single user session may require navigating two completely different UI paradigms. For instance, a leader managing a Cub Scout Pack interacts almost exclusively with Scoutbook Plus for advancement, while a leader in a Scouts BSA Troop must use Legacy Scoutbook for individual requirement tracking but switch to Scoutbook Plus for calendar management and activity logs. This bifurcation creates cognitive load and workflow friction. Users report confusion over which interface controls which data point, and frequently encounter "sync" issues where data entered in one side of the platform does not immediately reflect in the other.

Furthermore, the migration has introduced instability in critical areas such as user permissions. The shift from the legacy "Connection-based" permission model to the new "Position-based" model in Scoutbook Plus has left many functional volunteersâ€”such as outdoor chairs or advancement coordinatorsâ€”without the access rights they previously held, forcing units to scramble for workarounds. This instability erodes trust in the official platform and increases the appetite for a stable, unified third-party alternative that can abstract away these complexities.

---

## **3. Competitive Intelligence Deep Dive**

A successful product plan requires a granular understanding of the incumbent and the existing challengers. The following analysis dissects the feature sets, strengths, and vulnerabilities of the key players in the Scouting software market.

### **3.1 The Incumbent: Scoutbook & Scoutbook Plus**

**Functional Scope:**
Scoutbook serves as the centralized hub for tracking advancement progress for Cub Scouts, Scouts BSA, and Venturing. It includes modules for messaging, forums, service hour tracking, and calendaring. Recent updates have moved Cub Scout advancement, activity logs (hiking, camping, service), and the unit calendar to the Scoutbook Plus interface.

**Critical Weaknesses:**

* **Financials:** The platform's financial capabilities are severely limited. It offers a "Payment Log" which functions as a simple single-entry ledger, lacking the ability to track the unit's overall bank balance, categorize expenses for auditing, or manage inventory. While a PayPal integration exists, it is a pass-through mechanism rather than a comprehensive management tool.
* **Offline Access:** There is no "Leader App" with write capabilities. The "Scouting" mobile app is designed primarily for parents and youth to view progress. Leaders cannot approve requirements or take attendance while offline at a campsite, a critical failure for an outdoor-centric organization.
* **User Interface:** The Legacy interface is dated and non-responsive on mobile devices. While Scoutbook Plus is mobile-friendly, the constant switching between the two frustrates users who expect a cohesive experience.
* **Communication:** Messaging is limited to email blasts. There is no support for modern chat interfaces, push notifications for urgent alerts, or SMS integration, forcing units to rely on external tools like GroupMe or WhatsApp.

### **3.2 The Financial Heavyweight: TroopWebHost (TWH)**

**Market Position:**
TroopWebHost positions itself as the "all-in-one" solution with a heavy emphasis on financial integrity and public presence. It is arguably the strongest competitor in the "Back Office" domain.

**Key Differentiators:**

* **Fund Accounting:** TWH offers a sophisticated accounting engine that supports individual Scout accounts (ISA), troop operating funds, and event-specific ledgers. It allows treasurers to allocate costs dynamically (e.g., splitting a $400 gas bill among 12 attendees) and generate reports suitable for 501(c)(3) audits.
* **Public Website:** It includes a Content Management System (CMS) that allows units to build public-facing websites for recruitment, a feature completely absent in Scoutbook.

**Vulnerabilities:**

* **UX/UI:** The interface is widely described as "technologically ancient" and "clunky". It lacks the modern, app-like feel that younger parents expect.
* **Sync Friction:** TWH relies on manual file transfers to sync advancement data with Scoutbook. Leaders must export a file from TWH and upload it to Internet Advancement, a tedious process that introduces version control risks.

### **3.3 The Community Hub: TroopTrack (TT)**

**Market Position:**
TroopTrack differentiates on communication and community engagement. It markets itself as a private social network for the unit.

**Key Differentiators:**

* **Communication:** It offers the most robust communication suite, including email lists, forums, and a photo gallery. It is the only major competitor with a native mobile app that includes a chat feature.
* **Document Management:** TT provides cloud storage for unit documents, enabling a central repository for medical forms, meeting minutes, and policy documents.

**Vulnerabilities:**

* **Advancement Sync:** Similar to TWH, TT relies on manual export/import processes for advancement compliance. Users report that this process is "tedious" and often leads to units maintaining double records.
* **Cost:** It is a paid subscription service, which can be a barrier compared to the free Scoutbook offering, though users justify the cost through the "MoneyBook" financial features.

### **3.4 The Innovator: Scout Manager**

**Market Position:**
Scout Manager is a smaller player that has carved a niche by focusing on speed and automated synchronization.

**Key Differentiators:**

* **Chrome Extension Sync:** This is Scout Manager's "killer feature." Instead of requiring manual CSV uploads, they offer a browser extension that automates the data transfer between the Scout Manager interface and Scoutbook. This bi-directional sync capability drastically reduces the administrative burden and is a model that Chuckbox should emulate and improve upon.
* **Performance:** The platform emphasizes speed and a lightweight UI, contrasting with the slower load times often associated with Scoutbook.

**Vulnerabilities:**

* **Feature Depth:** It lacks the deep financial accounting features of TroopWebHost and is retiring its website builder capability. *Note: Chuckbox makes a similar strategic choiceâ€”this is intentional focus, not a gap (see Section 5.2).*

### **3.5 The Legacy Giant: TroopMaster**

**Market Position:**
TroopMaster is the legacy desktop software that has migrated to the web. It retains a loyal following among older units accustomed to its workflow.

**Key Differentiators:**

* **Advancement Rules:** It has a highly rigorous logic engine for advancement rules, often catching errors that other systems miss.
* **Offline App:** It offers a native mobile app with offline capabilities, addressing one of the key deficits of Scoutbook.

**Vulnerabilities:**

* **Data Silo:** While it supports imports/exports, it is historically a siloed system. Its UI is functional but reflects its desktop software roots rather than a modern web-first design philosophy.

---

## **4. Functional Domain Analysis and Gap Identification**

The success of Chuckbox depends on identifying specific functional gaps where Scoutbook fails to meet user needs. This section categorizes these gaps by domain.

### **4.1 Domain A: Financial Management & Fundraising**

**Unsatisfied Requirements:**
The most significant unsatisfied requirement in the market is the need for Audit-Ready Fund Accounting. Scoutbook's "Payment Log" treats all money as a single pool, which is insufficient for non-profit compliance. Units need to track "Restricted Funds" (e.g., money donated specifically for a new trailer) separate from "Unrestricted Funds" (general operating expenses).

Furthermore, the **"Scout Account"** concept is critical. Units often allow Scouts to earn money through fundraising to pay for their own camps. Parents need a clear, bank-like view of this balance: "I sold $500 of popcorn; 30% goes to my account ($150). I owe $200 for summer camp. My balance is now -$50." Scoutbook does not support this logic automatically.

**Gap:** Inventory Management. Units manage thousands of dollars in physical inventory (popcorn, camp cards, wreaths) during fundraising seasons. There is currently no integrated tool to track this inventory assignment to specific Scouts, forcing units to use external spreadsheets.

### **4.2 Domain B: Advancement Data Synchronization**

**Unsatisfied Requirements:**
The primary friction point for third-party adoption is the "Double Entry Tax." Leaders resent having to enter data twice. While manual CSV imports (supported by TWH and TT) work, they are tedious and prone to format errors, especially as BSA changes file specifications.

**Gap:** **Real-Time Bi-Directional Sync.** The ideal solution is an "autopilot" sync. When a leader marks a requirement as complete in the competitor platform, it shouldâ€”without further user interventionâ€”propagate to Scoutbook. Scout Manager's extension approaches this, but a fully integrated background agent that handles session management and error logging is the next evolutionary step.

**Gap:** **Partial Merit Badge Management.** Managing "partials" (incomplete badges started at summer camps) is a notorious pain point. Scoutbook's handling of partials is often rigid, and importing them from third-party camp software (like Tentaroo or Black Pug) is difficult. A system that can parse diverse import formats for partials would solve a major headache for Advancement Chairs.

### **4.3 Domain C: Offline Operations & Mobile Utility**

**Unsatisfied Requirements:**
Scouting happens in the woods, often outside cellular range. The lack of a Leader-Focused Offline App is a critical failure of the current ecosystem. Leaders need to be able to pull up a Scout's medical form (securely), view their emergency contact info, and mark off requirements while on a trail.

**Gap:** **Field Ops Dashboard.** A mobile mode that simplifies the UI for field use: large buttons, high contrast for sunlight visibility, and "cached-first" architecture that assumes no connectivity. This app must secure PII (Personally Identifiable Information) on the local device using encryption to comply with BSA and youth protection standards.

### **4.4 Domain D: Communication & Youth Protection**

**Unsatisfied Requirements:**
Modern communication habits have shifted to instant messaging, yet Scoutbook remains tethered to email. Units need communication tools that enforce Youth Protection policies at the platform level.

**Gap:** **Compliance-Enforced Chat.** A platform that offers Slack-like channels but enforces Youth Protection digital communication rules at the code level. Per BSA's digital communication policy, all electronic communications between adults and youth must include a parent/guardian in copy. This is distinct from the "Two-Deep Leadership" policy, which governs in-person supervision. Chuckbox will implement:
- Group channels where youth can participate (parents automatically receive copies)
- Direct messages between adults and youth are prohibited unless a parent/guardian is automatically CC'd
- Full audit logging of all communications

**Gap:** **SMS Broadcasting.** Native SMS integration for urgent alerts (e.g., "Campout cancelled due to severe weather") is a requested feature that is currently only available via expensive add-ons or workarounds in existing platforms.

---

## **5. "Chuckbox" Product Plan: Strategic Roadmap**

Based on the analysis above, **Chuckbox** is defined as the "Field Operating System" for Scouting units. It does not attempt to be the database of record. Instead, it wraps the operational chaos of the unit in a sleek, modern interface while automating the compliance link to Scoutbook.

### **5.1 Product Vision and Philosophy**

* **Philosophy:** "Scoutbook is for the Council; Chuckbox is for the Unit."
* **Core Value Prop:** We save you time on the things you *have* to do (Financials, Logistics, Communication) so you can focus on the program. We handle the Scoutbook data entry for you.
* **Architecture:** Mobile-First SaaS with a proprietary "Sync Agent" browser extension.
* **Strategic Focus:** Chuckbox intentionally omits website building capabilities. This is a conscious "do fewer things better" decisionâ€”we focus on operational excellence rather than public web presence. Units needing public websites can use dedicated platforms or their chartered organization's web presence.

### **5.2 Functional Feature Specifications**

#### **Module 1: The Financial Command Center (The Wedge)**

This module addresses the highest pain point and serves as the primary sales driver. **This is the MVP.**

* **General Ledger:** A double-entry accounting system pre-configured with a Chart of Accounts tailored for Scouting (e.g., categories for "Awards," "Camping Fees," "Fundraising Income").
  * *Implementation Note:* Use an established accounting library (e.g., **Medici** for Node.js) rather than building double-entry logic from scratch. Double-entry accounting has numerous edge cases (voided transactions, partial refunds, fiscal year rollovers) that are easy to get wrong.
* **Smart Scout Accounts:** A sub-ledger system where every transaction can be tagged to a specific Scout. Parents view a "Wallet" showing their child's available balance.
* **"Fair Share" Event Billing:** An automated engine where the Treasurer enters the total receipt for a trip (e.g., $450 for food), selects the roster of attendees, and the system automatically debits the appropriate amount from each Scout's account.
* **Fundraising Inventory Tracker:** A dedicated view for managing physical goods. Leaders can "check out" 10 cases of popcorn to a Scout; the system tracks this as a liability until the cash is turned in. *(Note: This is inventory check-out tracking, not point-of-sale transaction processing.)*
* **Integration:** Native Square integration for collecting dues via credit card, with transaction fees automatically categorized as an expense. Square handles PCI compliance, eliminating security burden. Using the pilot troop's existing Square account consolidates all payment reporting in one place and avoids additional merchant setup.

#### **Module 2: The "Sync-Link" Advancement Engine**

This module solves the double-entry problem and enables the use of Chuckbox as the primary interface.

* **Browser Extension Agent:** A lightweight extension for Chrome/Edge/Firefox built with the **Plasmo** framework (simplifies cross-browser development and Manifest V3 compliance).
  * *Function:* It detects when the user is logged into Scoutbook. It runs a background sync that scrapes the official advancement data (Down-Sync) to populate Chuckbox.
  * *Up-Sync:* When a leader approves a rank in Chuckbox, the extension queues this action and replays it into the Scoutbook interface using DOM manipulation or API calls (if available), verifying the success message.
  * *Fallback Mode:* When the Sync Agent fails, users receive human-readable error messages explaining the issue. Users can then either correct the issue or export a Scoutbook-compatible CSV file for manual upload as a backup.
  * *Architecture Note:* The sync logic should be implemented as a **separate, swappable module** to allow future migration to an official API (if BSA provides one) or alternative automation approach without rewriting the core application.
* **Partials Wizard:** A bulk-import tool designed to ingest data from summer camp systems (Black Pug, Tentaroo). It maps the messy export data from camps into the structured requirement data needed for Scoutbook.
* **Visualization:** A "Path to Eagle" dashboard that visualizes progress as a timeline rather than a checklist, helping parents understand critical path items (e.g., "You need to start your Family Life merit badge now to finish by your 18th birthday").

**Proactive API Access Request:**

As an early development task, formally request API access from BSA by emailing BSA.Legal@scouting.org. Even if rejected, this establishes good faith and documents the lack of official integration options. The request should explain:
- The tool is for unit volunteer use, not commercial exploitation
- The goal is reducing administrative burden on volunteers
- No intent to compete with BSA services

#### **Module 3: Field Operations & Logistics**

This module addresses the offline and logistical needs of the unit.

* **Offline Mobile App:** A native app (iOS/Android) built with **Flutter** and **Drift** (SQLite wrapper) for offline-first architecture.
  * *Roster & Medical:* Securely caches roster details and medical alerts (allergies, medications). Access requires biometric authentication (FaceID/Fingerprint) on first access per session.
  * *Security Model (Revised):* Encrypt local cache using device secure enclave keys. Wipe decryption key from memory after **5 minutes backgrounded** OR on explicit logout. (Previous "immediate wipe on background" was too aggressive and would frustrate users checking text messages.)
  * *QR Sign-off:* Generates a unique QR code for each Scout. Leaders can scan a Scout's code to instantly pull up their record and sign off a requirement.
* **Conflict Resolution Strategy:** When offline edits sync back to the server, use **last-write-wins with full audit log**. For Scouting data, conflicts are rare (typically only one person edits a Scout's record), and maintaining an audit trail allows manual resolution if disputes arise.
* **Smart Calendar:**
  * *RSVP Logic:* Supports complex RSVP states (Going, Not Going, Maybe, Driver).
  * *Driver Calculus:* Automatically calculates seat capacity based on RSVP'd drivers and vehicle capacities stored in their profiles.
  * *Permission Slips:* Generates digital PDF permission slips with e-signature capabilities, automatically attaching the event details.

#### **Module 4: Secure Communication Suite (Phase 3 â€” Deferred)**

This module replaces fragmented email threads and risky text messages. **Deferred to Phase 3** to focus on core financial value proposition first.

* **Build vs. Buy Decision: BUY.** Real-time messaging is deceptively complex. Building from scratch requires WebSocket infrastructure, message persistence/ordering, read receipts, push notifications (APNs/FCM), moderation tools, and offline message queuingâ€”easily 6+ months of development.
  
  **Recommended Approach:** Use an existing chat SDK with YP compliance wrapper:
  
  | Service | Cost | Notes |
  |---------|------|-------|
  | **Stream Chat** | Free tier available, ~$50/mo at scale | Excellent React Native/Flutter SDK, moderation built-in |
  | **SendBird** | Similar pricing | Good enterprise features |
  | **Supabase Realtime + custom UI** | Usage-based | More DIY, cheaper, integrates with recommended stack |

* **Youth Protection-Compliant Chat:** Implemented as middleware/webhooks on top of the chat SDK:
  * *Compliance:* Enforces BSA's digital communication policy requiring parent/guardian visibility on all adult-youth electronic communications. Direct messages involving youth automatically include the Scout's parent/guardian.
  * *Audit Logging:* All messages logged for compliance review.
* **Newsletter Builder:** A drag-and-drop email editor that pulls data from the Calendar and Advancement modules to auto-generate sections like "Upcoming Events" and "Recent Rank Advancements."
* **SMS Broadcasting:** Integrate with Twilio or similar for urgent alerts.

### **5.3 Technical Architecture & Implementation Strategy**

#### **5.3.1 Recommended Technology Stack**

The stack is optimized for: speed to MVP, low operational overhead, cost efficiency, and future scalability.

```
Chuckbox MVP Technical Stack
â”œâ”€â”€ Frontend
â”‚   â””â”€â”€ Next.js (React) â€” Web dashboard, server-side rendering
â”œâ”€â”€ Backend
â”‚   â””â”€â”€ Supabase
â”‚       â”œâ”€â”€ PostgreSQL â€” Primary database (with JSONB for flexible data)
â”‚       â”œâ”€â”€ Auth â€” Magic links (email-based, no passwords)
â”‚       â”œâ”€â”€ Realtime â€” For future chat features
â”‚       â”œâ”€â”€ Edge Functions â€” Serverless API endpoints
â”‚       â””â”€â”€ Storage â€” Document uploads (permission slips, etc.)
â”œâ”€â”€ Mobile
â”‚   â””â”€â”€ Flutter + Drift (SQLite) â€” Cross-platform with offline-first
â”œâ”€â”€ Sync Agent
â”‚   â””â”€â”€ Chrome Extension (Manifest V3) via Plasmo framework
â”œâ”€â”€ Payments
â”‚   â””â”€â”€ Square — Handles PCI compliance (uses existing troop account)
â”œâ”€â”€ Hosting
â”‚   â”œâ”€â”€ Vercel â€” Frontend hosting (generous free tier)
â”‚   â””â”€â”€ Supabase â€” Backend (generous free tier)
â”œâ”€â”€ Monitoring
â”‚   â”œâ”€â”€ Sentry — Error tracking (free tier)
│   ├── PostHog — Product analytics, feature flags (free tier)
â”‚   â””â”€â”€ Supabase Analytics â€” Built-in metrics
â”œâ”€â”€ CI/CD
â”‚   â””â”€â”€ GitHub Actions â€” Automated testing and deployment
â””â”€â”€ Communication (Phase 3)
    â””â”€â”€ Stream Chat or Supabase Realtime â€” With YP middleware
```

**Why Supabase over PostgreSQL + DynamoDB?**

The original architecture proposed PostgreSQL for relational data and DynamoDB for unstructured data (logs, chat). This hybrid approach adds operational complexity inappropriate for a small team or solo developer. Supabase provides:
- PostgreSQL with JSONB columns (handles semi-structured data well)
- Built-in auth (eliminates need to build login system)
- Realtime subscriptions (useful for chat later)
- Edge Functions (serverless, scales automatically)
- Single dashboard for all backend services

Migration to a more complex architecture is always possible once there are paying customers.

#### **5.3.2 Authentication Strategy**

**Recommended: Magic Links (Email-Based)**

- No passwords to manage or reset
- Familiar to users (similar to Slack, Notion)
- Supabase Auth supports this out of the box
- Fallback: OAuth with Google (many Scout families use Google)

**Role-Based Access Control (RBAC):**

| Role | Permissions |
|------|-------------|
| **Parent** | View own Scout's account balance, RSVP to events |
| **Scout** | View own advancement, RSVP (if 13+) |
| **Leader** | View roster, mark requirements, RSVP management |
| **Treasurer** | Full financial access, payment collection |
| **Admin (Key 3)** | All permissions, user management |

#### **5.3.3 API Design**

- Use `/api/v1/` prefix from day one to allow breaking changes in future versions
- RESTful design for CRUD operations
- Consider GraphQL for mobile app (reduces over-fetching on slow connections)

#### **5.3.4 Infrastructure Checklist**

| Component | Tool | Priority | Notes |
|-----------|------|----------|-------|
| Error Tracking | Sentry | Phase 0 | Free tier sufficient for pilot |
| Product Analytics | PostHog | Phase 0 | Free tier (1M events/month); track user behavior, feature usage |
| Application Metrics | Supabase Analytics | Phase 0 | Built-in, no setup |
| Uptime Monitoring | UptimeRobot or Checkly | Phase 1 | Free tier available |
| Log Aggregation | Supabase Logs | Phase 0 | Built-in |
| Backup/DR | Supabase Point-in-Time Recovery | Phase 0 | Enable on project creation |
| CDN | Vercel Edge Network | Phase 0 | Automatic with Vercel |

#### **5.3.5 Security Requirements**

* **Data Encryption:**
  - At rest: AES-256 (Supabase default)
  - In transit: TLS 1.3 (automatic with HTTPS)
* **Financial Data:** Tokenized via Square; no credit card numbers stored in Chuckbox
* **PII Protection:**
  - Row-level security (RLS) in Supabase to ensure users only see their own data
  - Medical information access logged
  - Automatic data expiration: medical info expires after 12 months unless re-confirmed
* **Audit Logging:** All data modifications logged with timestamp, user, and before/after values

### **5.4 Sync Agent: Detailed Architecture**

#### **5.4.1 The "Sync Agent" Mechanism**

The core technological differentiator for Chuckbox is the browser-based Sync Agent. Unlike a traditional API integration (which BSA does not offer publicly), the Agent operates as a client-side automation tool.

1. **Session Detection:** The extension monitors the scoutbook.scouting.org domain cookies to detect an active authenticated session.
2. **DOM Scraping (Read):** To "Down-Sync" data, the Agent navigates to the Scout's advancement page in the background (using a hidden iframe or fetch requests with the user's cookies) and parses the HTML to extract completion dates, "Approved" flags, and partial requirements.
3. **XHR Injection (Write):** To "Up-Sync" data (e.g., marking a merit badge as complete), the Agent replicates the exact XHR (XMLHttpRequest) or Fetch call that the Scoutbook frontend would make. It constructs the JSON payload with the requirement ID, date, and approver ID, and sends it to the Scoutbook endpoint.
4. **Verification:** The Agent parses the response to ensure the write was successful and updates the Chuckbox database state to "Synced."

#### **5.4.2 Rate Limiting & Detection Avoidance**

To minimize risk of detection and account termination:

| Safeguard | Implementation |
|-----------|----------------|
| Request Throttling | Max 1 request per second to Scoutbook |
| Backoff on Errors | Exponential backoff on 429/5xx responses (1s â†’ 2s â†’ 4s â†’ 8s â†’ fail) |
| User-Agent | Honest, distinctive: `Chuckbox-SyncAgent/1.0 (volunteer tool)` |
| Session Refresh | Detect session expiration gracefully; prompt user to re-login |
| User-Initiated | Sync triggered by explicit user action, not automatic background polling |

#### **5.4.3 Canary Testing Infrastructure**

Since this relies on internal Scoutbook endpoints which may change, the "Canary" testing infrastructure is vital.

**Implementation:**
- Cloud-based test suite (GitHub Actions scheduled workflow)
- Runs **daily at multiple times** (6 AM, 12 PM, 6 PM EST) to catch time-dependent issues
- Uses a dedicated test account with minimal real data
- Tests both read (advancement query) and write (mark requirement complete, then revert) operations

**On Failure:**
- Capture **screenshots** for debugging
- Alert via email/Slack
- Automatically disable Up-Sync in production extension until fix deployed
- Maintain **changelog of Scoutbook DOM changes** for forensic analysis

**Advanced (Future):**
- Visual regression testing (Percy, Chromatic) to catch UI changes automatically
- DOM structure fingerprinting to detect changes before they cause failures

#### **5.4.4 Graceful Degradation & Fallback**

When the Sync Agent encounters errors, the system provides:

1. **Human-Readable Error Messages:**
   - "Scoutbook session expired. Please log in to Scoutbook and try again."
   - "Scoutbook's interface has changed. Our team has been notified and is working on a fix. In the meantime, you can export your data for manual upload."
   - "Unable to reach Scoutbook. Please check your internet connection."

2. **Correction Options:** For recoverable errors, clear guidance on resolution (re-authenticate, retry, etc.)

3. **CSV Export Fallback:** One-click export of pending advancement data in Scoutbook's import format, enabling manual upload as a backup when automated sync is unavailable. This should be **prominently featured**, not hiddenâ€”the system should work gracefully in "manual mode."

4. **Status Dashboard:** Show sync status for each Scout's record (Synced, Pending, Error) so users know exactly what state their data is in.

### **5.5 Migration and Onboarding Strategy**

The biggest barrier to entry is the "sunk cost" of existing data in TroopWebHost or TroopTrack. Chuckbox must offer a frictionless migration path.

* **"White Glove" Concierge:** For units over a certain size (e.g., 50+ Scouts), offer a service where the Chuckbox team performs the data migration manually. The unit sends their TWH export files, and the Chuckbox team cleans, maps, and imports them.
* **The "Treasurer's Freemium":** Offer the Financial Module as a standalone, low-cost (or free for the first year) product. Once the Treasurer is using Chuckbox for money, the friction to move the rest of the unit (Advancement, Calendar) over is significantly reduced. This "land and expand" strategy targets the most painful problem first.
* **Import Tools:** Build importers for:
  - TroopWebHost export format
  - TroopTrack export format
  - Generic CSV (roster, financial history)

---

## **6. Legal & Compliance Analysis**

### **6.1 Sync Agent: BSA Terms of Service Analysis**

The Sync Agent's approach of automating data synchronization with Scoutbook requires careful legal consideration. This analysis examines the relevant Terms of Service provisions.

**Relevant ToS Provisions (from BSA Terms of Service at scouting.org):**

> *"Monitor, gather or copy any Content on this Site by using any robot, 'bot,' spider, crawler, spyware, engine, device, software, extraction tool or any other automatic device, utility or manual process of any kind."* â€” **Explicitly prohibited**

> *"Attempt to circumvent the security systems of the Site in any way."*

> *"Attempt to gain unauthorized access to services, materials, other accounts, computer systems or networks connected to any BSA server."*

**Risk Assessment:**

| Risk Factor | Severity | Likelihood | Notes |
|-------------|----------|------------|-------|
| ToS Violation (scraping) | High | Very High | The "robot/spider/extraction tool" clause directly addresses the Sync Agent's function |
| Account Termination | Medium | Medium | BSA could terminate user accounts using the extension |
| Legal Action | Low | Low | Unlikely for a small tool, but possible at scale |
| Technical Countermeasures | Medium | Medium-High | BSA could detect and block automated requests |

**Legal Analysis:**

The Sync Agent as proposed likely violates the BSA Terms of Service. The language prohibiting "any automatic device, utility or manual process" for gathering/copying content is broad.

However, important nuances exist:

1. **User-Initiated Action:** The Sync Agent operates on behalf of the authenticated user, using their own credentials and their own data. Courts have sometimes distinguished between scraping others' data vs. automating access to your own data (see *hiQ Labs v. LinkedIn*).

2. **No Commercial Harm:** Chuckbox does not compete with BSA's revenue model (Scoutbook is free), which weakens any damages claim.

3. **Enforcement Reality:** BSA has tolerated similar toolsâ€”Scout Manager's Chrome extension has operated for years, and the "Feature Assistant" extension is explicitly endorsed by some councils.

**Recommended Approach:**

*For Private/Personal Use (Pilot Troop):* Proceed with caution but low practical risk. BSA is unlikely to pursue enforcement against individual volunteer leaders using tools for their own unit.

*For Commercial Distribution:* Before launching publicly:
1. Consult an attorney specializing in ToS/CFAA issues
2. Consider requesting explicit permission from BSA (per their Terms: *"send a request with your proposed use to BSA.Legal@scouting.org"*)
3. Design defensive architecture:
   - User must explicitly initiate each sync (not background automation)
   - Rate-limit requests to avoid detection
   - Include prominent "use at your own risk" disclaimers
   - Build the manual CSV export fallback prominently
4. Monitor Scout Manager's continued operation as a bellwether for BSA enforcement posture

### **6.2 Health Information: Privacy Compliance Framework**

**HIPAA Applicability:**

HIPAA almost certainly does **not** apply to Chuckbox. HIPAA only covers "covered entities" (health plans, healthcare clearinghouses, healthcare providers who bill electronically) and their business associates. A Scout troop management app:

- Is not a healthcare provider
- Does not bill insurance
- Does not transmit PHI for healthcare transactions
- Collects health information voluntarily for emergency/safety purposes, not healthcare delivery

Nonprofit organizations collecting voluntary medical information for operational purposes (not healthcare delivery) are not HIPAA covered entities.

**Applicable Regulations:**

Even without HIPAA, Chuckbox has obligations under:

1. **State Data Breach Notification Laws** â€” All 50 states require notification if data is compromised
2. **COPPA (Children's Online Privacy Protection Act)** â€” Applies to children under 13; parental consent required
3. **General Privacy Best Practices** â€” User expectations and potential civil liability

**Lightweight Compliance Framework:**

*1. Data Minimization*
- Only collect what is actually needed
- Don't store full medical historyâ€”just allergy alerts, emergency medications, and emergency contact
- Consider a "view once" model where medical forms are displayed but not persistently stored

*2. Consent Documentation*
Create a simple consent acknowledgment when parents enter health information:

> *"I voluntarily provide the following health information for my Scout to enable unit leaders to respond appropriately in emergencies. I understand this information will be accessible to authorized adult leaders and will be stored securely. I may update or remove this information at any time."*

*3. Access Controls*
- Implement role-based access (only adult leaders with active YPT can view medical info)
- Log all access to medical records
- Require re-authentication (biometric or PIN) to view medical data on mobile

*4. Technical Safeguards*
- **Encryption at rest:** AES-256 for stored data
- **Encryption in transit:** TLS 1.3 for all connections
- **Mobile device:** Encrypt local cache using device secure enclave; wipe decryption key after 5 minutes backgrounded
- **Automatic expiration:** Medical data expires after 12 months unless re-confirmed

*5. Breach Response Plan*
Document a simple plan:
- How breaches will be detected
- Who will be notified (users, potentially state AG depending on state)
- Timeline (most states require notification within 30-60 days)

*6. Privacy Policy*
Create a straightforward privacy policy explaining:
- What data is collected
- How it's used
- Who can access it
- How long it's retained
- How users can request deletion

---

## **7. User Sentiment Analysis & Opportunities**

### **7.1 The "Privacy Paranoia" Opportunity**

User reviews on forums like Reddit and Scoutbook.com consistently reveal a deep distrust regarding the BSA's visibility into unit finances. Users fear that if they track their money in Scoutbook, the National Council might attempt to levy fees or assert control over unit assets.

* **Strategy:** Chuckbox should explicitly market itself as a "Unit-Controlled Data Silo." The marketing message should emphasize that financial data is *never* shared with the BSA or Council, providing a privacy guarantee that Scoutbook cannot match.

### **7.2 The "Sync Fatigue" Opportunity**

Reviews highlight the exhaustion of Advancement Chairs who spend hours manually copying dates from paper handbooks to TroopTrack, and then again to Scoutbook.

* **Strategy:** Position the "Sync Agent" as a time-saving miracle. "Save 10 hours a month" is a powerful metric for volunteers.

### **7.3 The "Transition Chaos" Opportunity**

The ongoing confusion between Legacy Scoutbook and Scoutbook Plus is a major frustration point. Users don't know where to find features.

* **Strategy:** Chuckbox provides a **Single Pane of Glass.** The user dashboard unifies all functions. The complexity of whether a data point belongs in Legacy or Plus is abstracted away by the software; the user just sees "Record Camping," and the Sync Agent handles the backend routing.

---

## **8. Strategic Outlook and Conclusion**

The landscape of Scouting software is currently defined by a forced transition that has alienated a significant portion of the user base. Scoutbook's pivot to "Plus" has improved some interfaces but created a disjointed experience that fails to address the core operational needs of high-functioning unitsâ€”specifically in finance, offline capability, and modern communication.

**Chuckbox** has a clear path to market success by adopting a strategy of "Operational Excellence paired with Compliance Automation." By building the best financial and logistical tools in the market and bridging the compliance gap with a proprietary browser sync agent, Chuckbox can solve the "double-entry" problem that currently paralyzes competitors.

The roadmap prioritizes the Financial Module as the market wedge, securing the unit's "wallet" before expanding into operations and advancement. This approach not only addresses the most acute user pain point but also establishes a sticky, high-value relationship with the unit's key decision-makers. In an ecosystem where volunteers are time-poor and compliance-weary, a platform that offers "Automated Compliance" is the ultimate value proposition.

---

## **9. Comparative Feature Matrix**

The following table summarizes the proposed Chuckbox feature set against the current market leaders, highlighting the strategic gaps identified in this research.

| Feature Domain | Scoutbook (Official) | TroopWebHost | TroopTrack | Scout Manager | Chuckbox (Proposed) |
|----------------|---------------------|--------------|------------|---------------|---------------------|
| **Advancement Sync** | Source of Truth | Manual CSV Import | Manual CSV Import | Chrome Ext. (Sync) | **Chrome Ext. (Agent) + CSV Fallback** |
| **Fund Accounting** | None | **Excellent** | Good | Moderate | **Excellent** |
| **Inventory Mgmt** | None | Limited | Limited | None | **Inventory Tracking** |
| **Mobile App** | Read-Only | Web Wrapper | Native (Chat) | Web Wrapper | **Native (Offline Write)** |
| **Messaging** | Email Only | Email lists | Email/Forum | Email lists | **YP-Compliant Chat/SMS** |
| **User Interface** | Split (Legacy/Plus) | Dated | Modernizing | Fast/Simple | **Unified Dashboard** |
| **Website Builder** | None | **Yes (CMS)** | Yes (CMS) | Retiring | **No (Strategic Focus)** |
| **Privacy** | BSA Controlled | Unit Controlled | Unit Controlled | Unit Controlled | **Unit Controlled** |

---

## **10. Development Checklist & Milestones**

### **Phase 0: Financial Core (MVP)**

**Target:** 3-4 months

- [ ] Set up Supabase project with PostgreSQL database
- [ ] Implement authentication (magic links)
- [ ] Design database schema for Scout accounts and transactions
- [ ] Integrate Medici (or similar) for double-entry accounting logic
- [ ] Build Treasurer dashboard (web)
- [ ] Implement Scout account ledger
- [ ] Build "Fair Share" event billing feature
- [ ] Integrate Square for payment collection (connect to existing troop account)
- [ ] Build Parent portal (view-only account balance)
- [ ] Basic reporting (account statements, transaction history)
- [ ] Set up Sentry error tracking
- [ ] Set up PostHog analytics (track payments, billing, feature usage)
- [ ] Set up GitHub Actions CI/CD
- [ ] Deploy to Vercel + Supabase
- [ ] **Milestone: Pilot troop Treasurer actively using for all financial tracking**

### **Phase 1: Calendar & Read-Only Sync**

**Target:** +2-3 months

- [ ] Build event calendar with RSVP
- [ ] Implement Driver Calculus
- [ ] Build permission slip generator
- [ ] Develop Sync Agent Chrome extension (read-only)
- [ ] Implement Canary testing infrastructure
- [ ] Request BSA API access (document response)
- [ ] **Milestone: Leaders can see advancement data pulled from Scoutbook**

### **Phase 2: Full Sync & Mobile**

**Target:** +3-4 months

- [ ] Implement bi-directional Sync Agent (write capability)
- [ ] Build Flutter mobile app with offline support
- [ ] Implement secure medical info caching
- [ ] Build QR sign-off feature
- [ ] Implement conflict resolution (last-write-wins with audit log)
- [ ] **Milestone: Leaders can mark requirements in Chuckbox and see them sync to Scoutbook**

### **Phase 3: Communication (Post-Validation)**

**Target:** After proving core value proposition

- [ ] Evaluate and select chat SDK (Stream, SendBird, or Supabase Realtime)
- [ ] Implement YP-compliance middleware
- [ ] Build chat UI
- [ ] Integrate SMS broadcasting (Twilio)
- [ ] Build newsletter builder
- [ ] **Milestone: Unit can use Chuckbox as primary communication tool**

---

## **11. Document Revision History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial research plan |
| 2.0 | January 2026 | Added market size analysis; Added BSA ToS legal analysis for Sync Agent; Added health information compliance framework; Clarified "Two-Deep" policy (now "Youth Protection-Compliant Chat"); Revised inventory feature from "POS" to "Inventory Tracking"; Standardized Canary testing to daily cadence; Added Sync Agent fallback behavior; Noted strategic decision on website builder omission; Added development approach (private pilot first) |
| 2.1 | January 2026 | Added MVP phasing strategy (Section 1.2); Revised technical stack to Supabase-based architecture; Added recommendation to use Medici for accounting logic; Changed mobile framework to Flutter + Drift; Revised mobile security (5-minute key wipe vs immediate); Added conflict resolution strategy (last-write-wins); Changed Module 4 (Chat) to "buy not build" with SDK recommendation; Added Sync Agent rate limiting and detection avoidance; Enhanced Canary testing (multiple daily runs, screenshots); Added authentication strategy (magic links); Added API versioning guidance; Added development checklist (Section 10); Removed DynamoDB in favor of single PostgreSQL database |
| 2.2 | January 2026 | Changed payment processor from Stripe to Square to leverage pilot troop's existing merchant account; Added PostHog for product analytics, feature flags, and session replay |

---

#### **Works Cited**

1. Scoutbook - Sam Houston Area Council, accessed January 6, 2026, https://shacbsa.org/scoutbook
2. Scoutbook - Scouting America, accessed January 6, 2026, https://www.scouting.org/resources/scoutbook/
3. TroopWebHost vs. Scoutbook - Scouting Forums, accessed January 6, 2026, https://discussions.scouting.org/t/troopwebhost-vs-scoutbook/261801
4. Thoughts on the acquisition of ScoutBook.com by BSA (05/04/2015), accessed January 6, 2026, https://community.trooptrack.com/t/thoughts-on-the-acquisition-of-scoutbook-com-by-bsa-05-04-2015/234
5. Introduction to Scoutbook Plus for Packs, accessed January 6, 2026, https://help.scoutbook.scouting.org/introduction-to-scoutbook-for-leaders/getting-a-pack-started-in-scoutbook/
6. Scoutbook vs Scoutbook Plus - Using Scoutbook & Scoutbook Plus - Scouting Forums, accessed January 6, 2026, https://discussions.scouting.org/t/scoutbook-vs-scoutbook-plus/460850
7. Many issues with Scoutbook Plus conversion. What is the plan? Write up every one?, accessed January 6, 2026, https://discussions.scouting.org/t/many-issues-with-scoutbook-plus-conversion-what-is-the-plan-write-up-every-one/506599
8. MAJOR CHANGE INFORMATION: Moving away from Connections - Using Scoutbook & Scoutbook Plus - Scouting Forums, accessed January 6, 2026, https://discussions.scouting.org/t/major-change-information-moving-away-from-connections/508118
9. How are Scoutbook Plus connections added and seen? - Scouting Forums, accessed January 6, 2026, https://discussions.scouting.org/t/how-are-scoutbook-plus-connections-added-and-seen/507143
10. What kind of financial recording does Scoutbook Provide? - Payment Logs (SB), accessed January 6, 2026, https://help.scoutbook.scouting.org/knowledge-base/what-kind-of-financial-recording-does-scoutbook-provide/
11. PayPal Payment Utility - SB Unit Admin Guide (SB) - Scoutbook Knowledge Base, accessed January 6, 2026, https://help.scoutbook.scouting.org/knowledge-base/paypal-payment-utility-sb/
12. Scouting Mobile App for Scoutbook, accessed January 6, 2026, https://help.scoutbook.scouting.org/knowledge-base/scouting-mobile-app-for-scoutbook/
13. Offline access to enter progress - Scouting Mobile App, accessed January 6, 2026, https://discussions.scouting.org/t/offline-access-to-enter-progress/233861
14. Difference Between Scoutbook & Internet Advancement Scoutbook Mobile?, accessed January 6, 2026, https://discussions.scouting.org/t/difference-between-scoutbook-internet-advancement-scoutbook-mobile/393486
15. Scoutbook, TroopTrack or both thoughts - BSA Troops, accessed January 6, 2026, https://community.trooptrack.com/t/scoutbook-trooptrack-or-both-thoughts/14028
16. TroopWebHost User Guide, accessed January 6, 2026, https://www.troopwebhost.org/helpchapter.aspx?ID=403
17. Manage Your Troop's Funds With TroopWebHost, accessed January 6, 2026, https://www.troopwebhost.org/help.aspx?ID=115
18. Troop Management Software for Scout Troops, accessed January 6, 2026, https://www.troopwebhost.com/
19. Scoutbook vs TroopWebHost : r/BSA - Reddit, accessed January 6, 2026, https://www.reddit.com/r/BSA/comments/za3xeo/scoutbook_vs_troopwebhost/
20. Upload Advancement from ScoutBook - TroopWebHost User Guide, accessed January 6, 2026, https://www.troopwebhost.org/help.aspx?ID=376
21. Import Advancement from 3rd party confusion - Scouting Forums, accessed January 6, 2026, https://discussions.scouting.org/t/import-advancement-from-3rd-party-confusion/248284
22. TroopTrack to Scoutbook? : r/BSA - Reddit, accessed January 6, 2026, https://www.reddit.com/r/BSA/comments/cvzbtb/trooptrack_to_scoutbook/
23. Pricing - TroopTrack - The Complete Scouting Software Solution, accessed January 6, 2026, https://trooptrack.com/pricing
24. The case for Scout Manager, accessed January 6, 2026, https://www.scoutmanager.com/the-case-for-scout-manager.html
25. Scout Manager - Chrome Web Store, accessed January 6, 2026, https://chromewebstore.google.com/detail/scout-manager/jcfonjlfigbfnajeimacgdndfkocfdia
26. Troopmaster - The Flagship of Scouting Software, accessed January 6, 2026, https://www.troopmaster.com/
27. Comparison of Boy Scout Troop Management Software - ScoutWiki, accessed January 6, 2026, https://en.scoutwiki.org/Comparison_of_Boy_Scout_Troop_Management_Software
28. Managing troop finances - My Scouting Tools, accessed January 6, 2026, https://discussions.scouting.org/t/managing-troop-finances/201353
29. Scoutbook for Financials - Scouting Forums, accessed January 6, 2026, https://discussions.scouting.org/t/scoutbook-for-financials/386753
30. Template to import advancement data - Scouting Forums, accessed January 6, 2026, https://discussions.scouting.org/t/template-to-import-advancement-data/431472
31. Importing Advancement to Scoutbook (Exporting from Tentaroo) - Scouting Forums, accessed January 6, 2026, https://discussions.scouting.org/t/importing-advancement-to-scoutbook-exporting-from-tentaroo/185784
32. Coming Soon: SMS 2024-11-12 - TroopTrack - The Complete Scouting Software Solution, accessed January 6, 2026, https://trooptrack.com/product_updates/305
33. Import leadership details from TroopWebHost to Scoutbook - Scouting Forums, accessed January 6, 2026, https://discussions.scouting.org/t/import-leadership-details-from-troopwebhost-to-scoutbook/377564
34. BSA 2023 Annual Report, accessed January 6, 2026, https://www.scouting.org/about/annual-report/year2023/
35. BSA Website Terms of Service, accessed January 6, 2026, https://www.scouting.org/legal/terms-and-conditions/
36. HIPAA and Nonprofits: Does Your Organization Need to Comply?, accessed January 6, 2026, https://pbpohio.org/article/hipaa-and-nonprofits-does-your-organization-need-to-comply/
