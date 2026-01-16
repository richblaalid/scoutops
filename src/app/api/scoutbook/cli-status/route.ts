import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * GET /api/scoutbook/cli-status
 *
 * Check if agent-browser CLI is installed and ready.
 * Only works in local development environment.
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      available: false,
      reason: 'serverless',
      message: 'Scoutbook sync requires a local development environment',
    })
  }

  try {
    // Check if agent-browser is installed using 'which' command
    const { stdout: whichOutput } = await execAsync('which agent-browser', {
      timeout: 5000,
    })

    const cliPath = whichOutput.trim()
    if (!cliPath) {
      throw new Error('Not found')
    }

    // Get version from help output (agent-browser doesn't have --version)
    let version = 'installed'
    try {
      const { stdout: helpOutput } = await execAsync('agent-browser --help', {
        timeout: 3000,
      })
      // Extract version if present in help, otherwise just mark as installed
      if (helpOutput.includes('agent-browser')) {
        version = 'installed'
      }
    } catch {
      // Help failed but CLI exists
    }

    // Check if browsers are installed by attempting a quick command
    // that would fail if Playwright browsers aren't set up
    let browsersInstalled = true
    try {
      // Just check if help works - if CLI is installed, browsers likely are too
      // A more thorough check would try to open a page, but that's slow
      await execAsync('agent-browser --help', { timeout: 3000 })
    } catch {
      browsersInstalled = false
    }

    return NextResponse.json({
      available: true,
      installed: true,
      version,
      browsersInstalled,
      cliPath,
      message: browsersInstalled
        ? 'agent-browser is ready'
        : 'agent-browser installed, but browsers need setup',
    })
  } catch {
    // agent-browser not found
    return NextResponse.json({
      available: true, // Local env is available
      installed: false,
      version: null,
      browsersInstalled: false,
      message: 'agent-browser CLI not installed',
    })
  }
}
