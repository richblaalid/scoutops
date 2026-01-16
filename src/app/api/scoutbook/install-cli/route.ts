import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * POST /api/scoutbook/install-cli
 *
 * Install agent-browser CLI and required browsers.
 * Only works in local development environment.
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      {
        success: false,
        error: 'Installation only available in local development',
      },
      { status: 400 }
    )
  }

  const steps: { step: string; success: boolean; output?: string; error?: string }[] = []

  try {
    // Step 1: Install agent-browser globally
    try {
      const { stdout, stderr } = await execAsync('npm install -g agent-browser', {
        timeout: 120000, // 2 minutes for npm install
      })
      steps.push({
        step: 'install-cli',
        success: true,
        output: stdout.trim() || 'Installed successfully',
      })
    } catch (error) {
      const err = error as Error & { stderr?: string }
      steps.push({
        step: 'install-cli',
        success: false,
        error: err.stderr || err.message,
      })

      // If CLI install failed, try with sudo hint
      return NextResponse.json({
        success: false,
        steps,
        error: 'Failed to install agent-browser. You may need to run with elevated permissions.',
        suggestion: 'Try running manually: sudo npm install -g agent-browser',
      })
    }

    // Step 2: Install Playwright browsers
    try {
      const { stdout, stderr } = await execAsync('agent-browser install', {
        timeout: 300000, // 5 minutes for browser download
      })
      steps.push({
        step: 'install-browsers',
        success: true,
        output: stdout.trim() || 'Browsers installed successfully',
      })
    } catch (error) {
      const err = error as Error & { stderr?: string }
      steps.push({
        step: 'install-browsers',
        success: false,
        error: err.stderr || err.message,
      })

      return NextResponse.json({
        success: false,
        steps,
        error: 'CLI installed but browser setup failed.',
        suggestion: 'Try running manually: agent-browser install',
      })
    }

    // Step 3: Verify installation
    try {
      const { stdout } = await execAsync('agent-browser --version', {
        timeout: 5000,
      })
      steps.push({
        step: 'verify',
        success: true,
        output: `Version: ${stdout.trim()}`,
      })
    } catch (error) {
      steps.push({
        step: 'verify',
        success: false,
        error: 'Could not verify installation',
      })
    }

    return NextResponse.json({
      success: true,
      steps,
      message: 'agent-browser installed and ready!',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        steps,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
