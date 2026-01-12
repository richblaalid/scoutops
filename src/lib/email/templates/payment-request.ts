export interface LedgerEntry {
  date: string
  description: string
  type: string
  debit: number
  credit: number
}

export interface PaymentRequestEmailData {
  guardianName: string
  scoutName: string
  unitName: string
  balance: number // negative = owes money
  ledgerEntries: LedgerEntry[]
  paymentUrl: string
  customMessage?: string
  // Fee information
  baseAmountCents?: number
  feeAmountCents?: number
  totalAmountCents?: number
  feesPassedToPayer?: boolean
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount))
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCents(cents: number): string {
  return formatCurrency(cents / 100)
}

export function generatePaymentRequestEmail(data: PaymentRequestEmailData): {
  html: string
  text: string
} {
  const {
    guardianName,
    scoutName,
    unitName,
    balance,
    ledgerEntries,
    paymentUrl,
    customMessage,
    baseAmountCents,
    feeAmountCents,
    totalAmountCents,
    feesPassedToPayer,
  } = data

  const amountOwed = Math.abs(balance)
  const owesMoneyStyle = balance < 0 ? 'color: #dc2626;' : 'color: #16a34a;'
  const balanceLabel = balance < 0 ? 'Amount Due' : 'Credit Balance'

  // Fee display values
  const hasFees = feesPassedToPayer && feeAmountCents && feeAmountCents > 0
  const displayTotal = totalAmountCents ? totalAmountCents / 100 : amountOwed

  // Generate ledger rows
  const ledgerRows = ledgerEntries
    .map(
      (entry) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(entry.date)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${entry.description}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #dc2626;">
        ${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #16a34a;">
        ${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
      </td>
    </tr>
  `
    )
    .join('')

  // Calculate totals
  const totalDebits = ledgerEntries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredits = ledgerEntries.reduce((sum, e) => sum + e.credit, 0)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #111827;">Payment Request</h1>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">${unitName}</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #374151;">Hello ${guardianName},</p>

              ${customMessage ? `<p style="margin: 0 0 16px; color: #374151;">${customMessage}</p>` : ''}

              <p style="margin: 0 0 24px; color: #374151;">
                Here is the account summary for <strong>${scoutName}</strong>:
              </p>

              <!-- Balance Box -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">${balanceLabel}</p>
                    <p style="margin: 0; font-size: 32px; font-weight: 700; ${owesMoneyStyle}">${formatCurrency(amountOwed)}</p>
                  </td>
                </tr>
              </table>

              <!-- Ledger Table -->
              ${
                ledgerEntries.length > 0
                  ? `
              <p style="margin: 0 0 12px; font-weight: 600; color: #111827;">Account Activity</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Date</th>
                    <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Description</th>
                    <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Charges</th>
                    <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Payments</th>
                  </tr>
                </thead>
                <tbody>
                  ${ledgerRows}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f9fafb;">
                    <td colspan="2" style="padding: 8px 12px; font-weight: 600; color: #374151;">Totals</td>
                    <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #dc2626;">${formatCurrency(totalDebits)}</td>
                    <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #16a34a;">${formatCurrency(totalCredits)}</td>
                  </tr>
                </tfoot>
              </table>
              `
                  : ''
              }

              <!-- Fee Breakdown (if applicable) -->
              ${
                hasFees && baseAmountCents
                  ? `
              <table role="presentation" style="width: 100%; margin-bottom: 24px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fbbf24;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px; font-weight: 600; color: #92400e; font-size: 14px;">Payment Breakdown</p>
                    <table role="presentation" style="width: 100%; font-size: 14px;">
                      <tr>
                        <td style="padding: 4px 0; color: #78350f;">Amount Due:</td>
                        <td style="padding: 4px 0; text-align: right; color: #78350f;">${formatCents(baseAmountCents)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #78350f;">Processing Fee:</td>
                        <td style="padding: 4px 0; text-align: right; color: #78350f;">${formatCents(feeAmountCents!)}</td>
                      </tr>
                      <tr style="border-top: 1px solid #fbbf24;">
                        <td style="padding: 8px 0 4px; font-weight: 700; color: #92400e;">Total:</td>
                        <td style="padding: 8px 0 4px; text-align: right; font-weight: 700; color: #92400e;">${formatCents(totalAmountCents!)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }

              <!-- CTA Button -->
              ${
                balance < 0
                  ? `
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Pay Now
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; text-align: center; color: #6b7280; font-size: 12px;">
                Or copy this link: <a href="${paymentUrl}" style="color: #2563eb;">${paymentUrl}</a>
              </p>
              `
                  : `
              <p style="margin: 0; color: #16a34a; text-align: center; font-weight: 500;">
                No payment is required at this time.
              </p>
              `
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                This email was sent by ${unitName} via Chuckbox.<br>
                If you have questions, please contact your unit leader directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  // Plain text version
  const textLedger = ledgerEntries
    .map((e) => `${formatDate(e.date)} - ${e.description}: ${e.debit > 0 ? `-${formatCurrency(e.debit)}` : `+${formatCurrency(e.credit)}`}`)
    .join('\n')

  // Fee breakdown for plain text
  const feeBreakdownText =
    hasFees && baseAmountCents
      ? `\nPayment Breakdown:\n  Amount Due: ${formatCents(baseAmountCents)}\n  Processing Fee: ${formatCents(feeAmountCents!)}\n  Total: ${formatCents(totalAmountCents!)}\n`
      : ''

  const text = `
Payment Request from ${unitName}

Hello ${guardianName},

${customMessage ? customMessage + '\n\n' : ''}Here is the account summary for ${scoutName}:

${balanceLabel}: ${formatCurrency(amountOwed)}

${ledgerEntries.length > 0 ? `Account Activity:\n${textLedger}\n\nTotal Charges: ${formatCurrency(totalDebits)}\nTotal Payments: ${formatCurrency(totalCredits)}` : ''}
${feeBreakdownText}
${balance < 0 ? `Pay now: ${paymentUrl}` : 'No payment is required at this time.'}

---
This email was sent by ${unitName} via Chuckbox.
If you have questions, please contact your unit leader directly.
`.trim()

  return { html, text }
}
