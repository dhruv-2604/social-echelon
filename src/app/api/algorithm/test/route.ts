import { NextRequest, NextResponse } from 'next/server'
import { AlgorithmTestUtilities } from '@/lib/algorithm/test-utilities'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, params = {} } = body
    
    console.log(`Running test action: ${action}`, params)
    
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