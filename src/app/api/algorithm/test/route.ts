import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { AlgorithmTestUtilities } from '@/lib/algorithm/test-utilities'

export async function POST(request: NextRequest) {
  try {
    // Authentication check - only allow admin users or cron jobs
    const authHeader = request.headers.get('authorization')
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Check if user is admin
      const cookieStore = await cookies()
      const userId = cookieStore.get('user_id')?.value
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      const supabaseAdmin = getSupabaseAdmin()
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }
    
    // Parse and validate input
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    
    const { action, params = {} } = body
    
    // Validate action parameter
    const validActions = ['simulate_reach_drop', 'simulate_format_preference', 'generate_realistic_data', 'reset_data', 'get_status']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    switch (action) {
      case 'simulate_reach_drop':
        await AlgorithmTestUtilities.simulateReachDrop(
          params.niches || ['fashion', 'lifestyle'],
          params.percentDrop || 25,
          params.affectedUsers || 35
        )
        return NextResponse.json({
          success: true,
          message: 'Simulated reach drop successfully',
          details: {
            niches: params.niches || ['fashion', 'lifestyle'],
            percentDrop: params.percentDrop || 25,
            affectedUsers: params.affectedUsers || 35
          }
        })
        
      case 'simulate_format_preference':
        await AlgorithmTestUtilities.simulateFormatPreference(
          params.format || 'reel',
          params.boost || 40
        )
        return NextResponse.json({
          success: true,
          message: 'Simulated format preference successfully',
          details: {
            format: params.format || 'reel',
            boost: params.boost || 40
          }
        })
        
      case 'generate_realistic_data':
        await AlgorithmTestUtilities.generateRealisticData(params.days || 14)
        return NextResponse.json({
          success: true,
          message: 'Generated realistic data successfully',
          details: {
            days: params.days || 14
          }
        })
        
      case 'cleanup_test_data':
        await AlgorithmTestUtilities.cleanupTestData(params.daysToKeep || 7)
        return NextResponse.json({
          success: true,
          message: 'Cleaned up test data successfully',
          details: {
            daysToKeep: params.daysToKeep || 7
          }
        })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: simulate_reach_drop, simulate_format_preference, generate_realistic_data, or cleanup_test_data' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Test utility error:', error)
    return NextResponse.json(
      { error: 'Failed to run test action' },
      { status: 500 }
    )
  }
}

// GET endpoint to show available test actions
export async function GET() {
  return NextResponse.json({
    available_actions: [
      {
        action: 'simulate_reach_drop',
        description: 'Simulate a platform-wide reach drop',
        params: {
          niches: 'Array of niches to affect (default: ["fashion", "lifestyle"])',
          percentDrop: 'Percentage drop in reach (default: 25)',
          affectedUsers: 'Number of users to affect (default: 35)'
        }
      },
      {
        action: 'simulate_format_preference',
        description: 'Simulate Instagram preferring a specific content format',
        params: {
          format: 'Format to boost: "reel", "carousel", or "post" (default: "reel")',
          boost: 'Percentage boost for the format (default: 40)'
        }
      },
      {
        action: 'generate_realistic_data',
        description: 'Generate realistic performance data for testing',
        params: {
          days: 'Number of days of data to generate (default: 14)'
        }
      },
      {
        action: 'cleanup_test_data',
        description: 'Clean up old test data',
        params: {
          daysToKeep: 'Keep data from last N days (default: 7)'
        }
      }
    ],
    example_usage: {
      method: 'POST',
      body: {
        action: 'simulate_reach_drop',
        params: {
          niches: ['fashion', 'lifestyle'],
          percentDrop: 30,
          affectedUsers: 40
        }
      }
    }
  })
}