#!/usr/bin/env node

/**
 * CSV to SQL converter for brand imports
 * Usage: node csv-to-sql-brands.js < brands.csv > brands-import.sql
 * 
 * Expected CSV format:
 * Brand,InstagramHandle,Location,Followers,Industry,IndustryNiche,InfluencerTypes,ShipsTo,RecentCampaigns,Strategy
 */

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let isFirstLine = true;
let sqlStatements = [];

// SQL header
console.log(`-- Auto-generated Brand Import from CSV
-- Generated on: ${new Date().toISOString()}

-- Add new columns if they don't exist
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS followers TEXT,
ADD COLUMN IF NOT EXISTS industry_niche TEXT,
ADD COLUMN IF NOT EXISTS influencer_types TEXT,
ADD COLUMN IF NOT EXISTS ships_to TEXT,
ADD COLUMN IF NOT EXISTS recent_campaigns TEXT,
ADD COLUMN IF NOT EXISTS strategy TEXT;

-- Import brands
INSERT INTO brands (
  name,
  instagram_handle,
  location,
  followers,
  industry,
  industry_niche,
  influencer_types,
  ships_to,
  recent_campaigns,
  strategy
) VALUES`);

rl.on('line', (line) => {
  // Skip header row
  if (isFirstLine) {
    isFirstLine = false;
    return;
  }
  
  // Parse CSV line (handle commas in quoted strings)
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  // Create SQL value tuple
  if (values.length >= 10) {
    const brand = values[0].replace(/'/g, "''");
    const instagram = values[1].replace(/'/g, "''");
    const location = values[2].replace(/'/g, "''");
    const followers = values[3].replace(/'/g, "''");
    const industry = values[4].replace(/'/g, "''");
    const industryNiche = values[5].replace(/'/g, "''");
    const influencerTypes = values[6].replace(/'/g, "''");
    const shipsTo = values[7].replace(/'/g, "''");
    const recentCampaigns = values[8].replace(/'/g, "''");
    const strategy = values[9].replace(/'/g, "''");
    
    const sqlValue = `(
  '${brand}',
  '${instagram}',
  '${location}',
  '${followers}',
  '${industry}',
  '${industryNiche}',
  '${influencerTypes}',
  '${shipsTo}',
  '${recentCampaigns}',
  '${strategy}'
)`;
    
    sqlStatements.push(sqlValue);
  }
});

rl.on('close', () => {
  // Output all SQL statements
  console.log(sqlStatements.join(',\n'));
  
  // Add conflict resolution and verification
  console.log(`
ON CONFLICT (name) DO UPDATE SET
  instagram_handle = EXCLUDED.instagram_handle,
  location = EXCLUDED.location,
  followers = EXCLUDED.followers,
  industry = EXCLUDED.industry,
  industry_niche = EXCLUDED.industry_niche,
  influencer_types = EXCLUDED.influencer_types,
  ships_to = EXCLUDED.ships_to,
  recent_campaigns = EXCLUDED.recent_campaigns,
  strategy = EXCLUDED.strategy,
  last_updated = NOW();

-- Verify import
SELECT COUNT(*) as total_brands FROM brands;
SELECT name, instagram_handle, location, followers, industry FROM brands ORDER BY name LIMIT 10;`);
});