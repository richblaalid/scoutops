# ChuckBox Brand Guide

> **Version 4.0** — January 2026
>
> The authoritative source for ChuckBox brand identity, colors, typography, and voice.

---

## Brand Overview

ChuckBox is the "kitchen drawer" for Scouting units—everything you need, organized in one place. Our brand embodies warmth, reliability, and the joy of well-organized adventures.

### Why "ChuckBox"?

A **chuck box** (or patrol box) is a portable camping kitchen—a wooden box with compartments for cooking supplies, utensils, spices, and everything a camp cook needs. It's the heart of any campsite kitchen, keeping everything organized so you can focus on the meal, not the mess.

That's exactly what we do for Scout unit operations: organize the chaos so leaders can focus on the program.

### Brand Position

> "Scoutbook is for the Council; ChuckBox is for the Unit."

### Brand Attributes

| Attribute | Description |
|-----------|-------------|
| **Welcoming** | Like a well-stocked camp kitchen, we're inviting and ready to help. Our design feels warm, not corporate. |
| **Organized** | Everything has its place. Our interface is clean, logical, and helps users find what they need fast. |
| **Trustworthy** | We handle sensitive financial and personal data. Our visual identity conveys stability and security. |
| **Efficient** | Volunteer time is precious. Every design decision should feel purposeful—no unnecessary clutter. |

---

## Logo

The ChuckBox logo depicts a camp chuck box on splayed legs with an amber work surface—the iconic silhouette every camper recognizes. The compartments inside represent organization, while the warm amber accent adds energy and approachability.

### Logo Colors

| Element | Color | Hex | Tailwind |
|---------|-------|-----|----------|
| Box Body & Legs | Pine 800 | `#234D3E` | `forest-800` |
| Compartments & Divider | Pine 600 | `#3D8B6A` | `forest-600` |
| Work Surface | Amber 600 | `#d97706` | `amber-600` |

### Wordmark Colors

| Context | "Chuck" | "Box" |
|---------|---------|-------|
| Light background | Pine 800 `#234D3E` | Amber 700 `#b45309` |
| Dark background | White | Amber 600 `#d97706` |

### Logo Files

```
src/app/icon.svg          # Favicon
src/app/apple-icon.svg    # Apple touch icon
```

### Usage Guidelines

- **Minimum size**: Icon alone: 24px. With wordmark: 120px wide.
- **Clear space**: Maintain padding equal to the height of the work surface bar around all sides.
- **Dark backgrounds**: Use lighter Pine variants (600) for box body.

---

## Color System

ChuckBox uses a warm, outdoorsy color palette inspired by Scout camp aesthetics. The system has a clear hierarchy:

- **Green (Pine)** = Primary Action (CTAs, buttons, links, focus states)
- **Amber** = Accent & Emphasis (highlights, badges, decorative elements)

### Color Hierarchy

| Role | Usage | Primary Color |
|------|-------|---------------|
| **Primary Action** | Buttons, links, active states | Pine 800 `#234D3E` |
| **Accent/Emphasis** | Headline highlights, badges, decorative | Amber 700 `#b45309` |
| **UI Actions** | Checkboxes, completion indicators | Amber 600 `#d97706` |
| **Background** | Page backgrounds | Cream 300 `#FAF3EB` |

### Pine Greens (Primary)

The primary brand color for buttons, links, and interactive elements.

| Shade | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| 50 | `#f0fdf4` | `forest-50` | Lightest tint |
| 100 | `#dcfce7` | `forest-100` | Light backgrounds |
| 200 | `#bbf7d0` | `forest-200` | Subtle accents |
| 300 | `#86efac` | `forest-300` | Light indicators |
| 400 | `#6BC492` | `forest-400` | Secondary elements |
| 500 | `#52A07E` | `forest-500` | Dark mode compartments |
| 600 | `#3D8B6A` | `forest-600` | Hover states, dark mode primary |
| 700 | `#2D6A4F` | `forest-700` | Secondary actions |
| **800** | `#234D3E` | `forest-800` | **Primary brand color** |
| 900 | `#1B3D30` | `forest-900` | Deepest pine |

### Amber (Accent)

Warm accent color for headline highlights, decorative elements, and visual emphasis.

| Shade | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| 50 | `#fffbeb` | `amber-50` | Light backgrounds |
| 100 | `#fef3c7` | `amber-100` | Warning backgrounds |
| 200 | `#fde68a` | `amber-200` | Subtle highlights |
| 300 | `#fcd34d` | `amber-300` | Light accents |
| 400 | `#fbbf24` | `amber-400` | Interactive elements |
| 500 | `#f59e0b` | `amber-500` | Attention states |
| **600** | `#d97706` | `amber-600` | **UI actions** (checkboxes, badges) |
| **700** | `#b45309` | `amber-700` | **Primary accent** (highlights, "Box" text) |
| 800 | `#92400e` | `amber-800` | Dark accent |
| 900 | `#78350f` | `amber-900` | Darkest accent |

### Cream Backgrounds

Subtle warm tones that feel inviting, not clinical.

| Shade | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| 100 | `#FFFDF9` | `cream-100` | Light card backgrounds |
| **300** | `#FAF3EB` | `cream-300` | **Page background** |
| 400 | `#F5E6D3` | `cream-400` | Card accents |

### Stone Neutrals

Warm gray tones for text and borders.

| Shade | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| 50 | `#FAFAF9` | `stone-50` | Subtle backgrounds |
| 100 | `#F5F5F4` | `stone-100` | Muted backgrounds |
| 200 | `#E7E5E4` | `stone-200` | Borders, dividers |
| 300 | `#D6D3D1` | `stone-300` | Secondary borders |
| 400 | `#A8A29E` | `stone-400` | Placeholder text |
| 500 | `#78716C` | `stone-500` | Secondary text |
| 600 | `#57534E` | `stone-600` | Body text |
| 700 | `#44403C` | `stone-700` | Subheadings |
| 800 | `#292524` | `stone-800` | Headlines |
| 900 | `#1C1917` | `stone-900` | Darkest text |

### Semantic Colors

Status indicators and feedback.

| Status | Default | Light | Dark | Usage |
|--------|---------|-------|------|-------|
| Success | `#059669` | `#D1FAE5` | `#047857` | Confirmations, synced |
| Warning | `#D97706` | `#FEF3C7` | `#B45309` | Cautions, pending |
| Error | `#DC2626` | `#FEE2E2` | `#B91C1C` | Errors, negative balances |
| Info | `#0284C7` | `#E0F2FE` | `#0369A1` | Information, help |

---

## Typography

ChuckBox uses warm, modern fonts that feel human and approachable while remaining highly readable.

### Font Stack

| Role | Font | Fallback | Usage |
|------|------|----------|-------|
| **Display** | Nunito | system-ui, sans-serif | Headlines, titles, logo text |
| **Body** | Nunito | system-ui, sans-serif | Paragraphs, UI text |
| **Editorial** | Source Serif 4 | Georgia, serif | Reports, quotes, testimonials |

### Type Scale

| Level | Size | Weight | Tailwind |
|-------|------|--------|----------|
| Display 1 | 48px (3rem) | 800 | `text-5xl font-extrabold` |
| Display 2 | 36px (2.25rem) | 700 | `text-4xl font-bold` |
| H1 | 30px (1.875rem) | 700 | `text-3xl font-bold` |
| H2 | 24px (1.5rem) | 600 | `text-2xl font-semibold` |
| H3 | 20px (1.25rem) | 600 | `text-xl font-semibold` |
| H4 | 18px (1.125rem) | 600 | `text-lg font-semibold` |
| Body | 16px (1rem) | 400 | `text-base` |
| Small | 14px (0.875rem) | 400 | `text-sm` |
| Caption | 12px (0.75rem) | 400 | `text-xs` |

### CSS Variables

```css
--font-display: 'Nunito', system-ui, sans-serif;
--font-body: 'Nunito', system-ui, sans-serif;
--font-serif: 'Source Serif 4', Georgia, serif;
```

---

## Shadows & Elevation

Shadows use forest-tinted colors for brand consistency. Higher elevation = more prominence.

| Level | Shadow | Usage |
|-------|--------|-------|
| xs | `0 1px 2px rgba(20, 83, 45, 0.05)` | Subtle depth |
| sm | `0 1px 3px rgba(20, 83, 45, 0.08)` | Buttons, inputs |
| md | `0 4px 6px rgba(20, 83, 45, 0.08)` | Cards |
| lg | `0 10px 15px rgba(20, 83, 45, 0.08)` | Dropdowns, modals |
| xl | `0 20px 25px rgba(20, 83, 45, 0.10)` | Large cards |
| 2xl | `0 25px 50px rgba(20, 83, 45, 0.15)` | Hero elements |

### Brand Shadows

```css
--shadow-forest: 0 4px 12px rgba(20, 83, 45, 0.3);    /* CTA buttons */
--shadow-amber: 0 4px 12px rgba(180, 83, 9, 0.3);     /* Accent buttons */
--shadow-glow: 0 0 20px rgba(180, 83, 9, 0.25);       /* Success states */
```

---

## Border Radius

| Size | Value | Usage |
|------|-------|-------|
| sm | 4px | Tags, badges |
| md | 6px | Buttons, inputs |
| lg | 8px (`--radius`) | Default |
| xl | 12px | Cards |
| 2xl | 16px | Large cards, modals |
| full | 9999px | Pills, avatars |

---

## Voice & Tone

ChuckBox speaks like your most organized friend—the one who always has the right tool and knows where everything is. We're helpful, warm, and occasionally have a bit of fun.

### Writing Principles

| Principle | Description |
|-----------|-------------|
| **Be Direct** | Volunteer time is precious. Get to the point. Use active voice and simple words. |
| **Be Friendly** | Use contractions. Add the occasional emoji where appropriate. Sound human, not robotic. |
| **Be Helpful** | Anticipate what users need. Offer next steps. Explain errors in plain language. |
| **Be Trustworthy** | Never exaggerate. Be transparent about limitations. Protect user data fiercely. |

### Writing Examples

| Do | Don't |
|----|-------|
| "All set! 12 requirements synced." | "Synchronization process executed. 12 database records have been modified." |
| "Heads up—John's account is running low." | "Warning: Account balance below threshold. Action required." |
| "Ready to ditch the spreadsheet?" | "Migrate your financial data to our platform today." |
| "Where did that $47.50 go?" | "Complete transaction audit trail functionality." |

### Key Phrases

| Phrase | Usage |
|--------|-------|
| "Your unit, organized." | Primary tagline |
| "Everything in its place." | Alternate tagline |
| "Zero spreadsheets" | Our promise |
| "The treasurer's toolkit" | What we are |
| "Built by a treasurer who hated spreadsheets" | Origin story |
| "Scoutbook is for the Council. ChuckBox is for the Unit." | Positioning |

---

## Quick Reference for Developers

### Common Color Classes

```jsx
// Primary buttons
className="bg-forest-800 hover:bg-forest-700 text-white"

// Accent buttons
className="bg-amber-700 hover:bg-amber-800 text-white"

// Success indicators
className="bg-amber-600 text-white"  // Completion checkboxes

// Page backgrounds
className="bg-cream-300"

// Cards
className="bg-white border border-stone-200"

// Text colors
className="text-stone-800"  // Headlines
className="text-stone-600"  // Body text
className="text-stone-500"  // Secondary text

// Accent highlights
className="text-amber-700"  // Emphasis text
```

### CSS Variables

```css
/* Primary */
--primary: 160 37% 22%;             /* Pine 800 */
--primary-foreground: 33 56% 95%;   /* Cream */

/* Accent */
--accent: 25 95% 37%;               /* Amber 700 */
--accent-foreground: 0 0% 100%;     /* White */

/* Background */
--background: 33 56% 95%;           /* Cream 300 */
--foreground: 24 10% 10%;           /* Stone 900 */
```

---

## Files Reference

### Configuration

| File | Purpose |
|------|---------|
| `tailwind.config.ts` | Color palette, fonts, shadows |
| `src/app/globals.css` | CSS variables, dark mode |

### Brand Assets

| File | Purpose |
|------|---------|
| `src/app/icon.svg` | Favicon |
| `src/app/apple-icon.svg` | Apple touch icon |
| `src/components/ui/logo.tsx` | Logo component |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | Jan 2026 | Consolidated all brand docs into BRAND.md; documented actual implementation colors |
| 3.0 | Jan 2026 | Added brand origin story, logo anatomy |
| 2.0 | Jan 2026 | Updated to Tailwind green/amber palette |
| 1.0 | Dec 2025 | Initial brand guide |
