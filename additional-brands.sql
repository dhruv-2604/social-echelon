-- Additional Real Brands for Brand Matching
-- These are brands known to actively work with micro-influencers

INSERT INTO brands (
  name, 
  website, 
  instagram_handle,
  industry,
  sub_industry,
  description,
  target_follower_min,
  target_follower_max,
  target_engagement_min,
  target_niches,
  budget_min,
  budget_max,
  contact_email,
  aesthetic_keywords,
  content_types,
  brand_values,
  campaign_types,
  payment_terms,
  market_position,
  growth_trajectory,
  verified,
  audience_demographics
) VALUES 

-- Fashion & Accessories
(
  'Revolve',
  'https://revolve.com',
  '@revolve',
  'Fashion',
  'Women\'s Fashion',
  'Trendy fashion for the social generation',
  5000,
  500000,
  3.0,
  ARRAY['fashion', 'lifestyle', 'travel'],
  500,
  5000,
  'influencers@revolve.com',
  ARRAY['trendy', 'colorful', 'aspirational', 'luxe'],
  ARRAY['reels', 'carousel', 'stories'],
  ARRAY['empowerment', 'style', 'celebration'],
  ARRAY['sponsored_post', 'event_invitation', 'product_gifting'],
  'Net 30',
  'leader',
  'steady',
  true,
  '{
    "locations": {
      "countries": ["USA", "UK", "Australia", "Canada"],
      "cities": ["Los Angeles", "New York", "Miami", "London", "Sydney"]
    },
    "ageRanges": ["18-24", "25-34"],
    "incomeLevel": ["medium", "high"],
    "genderPreference": "female"
  }'::jsonb
),

(
  'Princess Polly',
  'https://princesspolly.com',
  '@princesspolly',
  'Fashion',
  'Fast Fashion',
  'Trendy affordable fashion for Gen Z',
  3000,
  100000,
  4.0,
  ARRAY['fashion', 'college', 'lifestyle'],
  300,
  2000,
  'collabs@princesspolly.com',
  ARRAY['trendy', 'fun', 'youthful', 'bold'],
  ARRAY['reels', 'hauls', 'outfit_posts'],
  ARRAY['inclusivity', 'self-expression', 'fun'],
  ARRAY['sponsored_post', 'affiliate', 'discount_codes'],
  'Net 15',
  'challenger',
  'rapid',
  true,
  '{
    "locations": {
      "countries": ["USA", "Australia", "UK"],
      "cities": ["Los Angeles", "San Diego", "Phoenix", "Austin"]
    },
    "ageRanges": ["18-24"],
    "incomeLevel": ["low", "medium"],
    "genderPreference": "female"
  }'::jsonb
),

-- Beauty & Skincare
(
  'Fenty Beauty',
  'https://fentybeauty.com',
  '@fentybeauty',
  'Beauty',
  'Makeup',
  'Beauty for all skin tones',
  10000,
  1000000,
  3.5,
  ARRAY['beauty', 'makeup', 'diversity'],
  1000,
  10000,
  'influencer@fentybeauty.com',
  ARRAY['bold', 'inclusive', 'vibrant', 'edgy'],
  ARRAY['tutorials', 'reels', 'before_after'],
  ARRAY['inclusivity', 'diversity', 'authenticity', 'empowerment'],
  ARRAY['sponsored_post', 'ambassador', 'launch_campaign'],
  'Net 30',
  'leader',
  'rapid',
  true,
  '{
    "locations": {
      "countries": ["USA", "UK", "France", "Canada", "UAE"],
      "cities": ["New York", "Los Angeles", "Atlanta", "Miami", "Dubai", "Paris"]
    },
    "ageRanges": ["18-24", "25-34", "35-44"],
    "incomeLevel": ["medium", "high"]
  }'::jsonb
),

(
  'The Ordinary',
  'https://theordinary.com',
  '@theordinary',
  'Beauty',
  'Skincare',
  'Clinical skincare at honest prices',
  5000,
  200000,
  3.0,
  ARRAY['skincare', 'beauty', 'wellness'],
  300,
  2000,
  'partnerships@deciem.com',
  ARRAY['minimal', 'clinical', 'clean', 'educational'],
  ARRAY['tutorials', 'routines', 'reviews'],
  ARRAY['transparency', 'education', 'accessibility', 'science'],
  ARRAY['sponsored_post', 'product_seeding', 'education'],
  'Net 45',
  'leader',
  'steady',
  true,
  '{
    "locations": {
      "countries": ["USA", "Canada", "UK", "Australia", "France"],
      "cities": ["Toronto", "New York", "London", "Paris"]
    },
    "ageRanges": ["25-34", "35-44"],
    "incomeLevel": ["medium"]
  }'::jsonb
),

-- Food & Beverage
(
  'HelloFresh',
  'https://hellofresh.com',
  '@hellofresh',
  'Food',
  'Meal Delivery',
  'Fresh ingredients and recipes delivered',
  5000,
  500000,
  2.5,
  ARRAY['food', 'lifestyle', 'family', 'cooking'],
  500,
  3000,
  'influencers@hellofresh.com',
  ARRAY['homey', 'fresh', 'colorful', 'approachable'],
  ARRAY['reels', 'stories', 'unboxing', 'cooking_videos'],
  ARRAY['convenience', 'health', 'sustainability', 'family'],
  ARRAY['sponsored_post', 'discount_codes', 'long_term'],
  'Net 30',
  'leader',
  'steady',
  true,
  '{
    "locations": {
      "countries": ["USA", "Canada", "UK", "Germany", "Australia"],
      "cities": ["Chicago", "Denver", "Seattle", "Austin", "Toronto"]
    },
    "ageRanges": ["25-34", "35-44"],
    "incomeLevel": ["medium", "high"]
  }'::jsonb
),

(
  'Liquid Death',
  'https://liquiddeath.com',
  '@liquiddeath',
  'Beverage',
  'Water',
  'Murder your thirst with canned water',
  10000,
  500000,
  3.0,
  ARRAY['lifestyle', 'humor', 'sustainability', 'punk'],
  1000,
  5000,
  'murder@liquiddeath.com',
  ARRAY['edgy', 'dark', 'humorous', 'rebellious'],
  ARRAY['reels', 'memes', 'stories'],
  ARRAY['sustainability', 'humor', 'rebellion', 'environment'],
  ARRAY['sponsored_post', 'ambassador', 'event_sponsorship'],
  'Net 15',
  'challenger',
  'rapid',
  true,
  '{
    "locations": {
      "countries": ["USA"],
      "cities": ["Los Angeles", "Austin", "Portland", "Denver", "Nashville"]
    },
    "ageRanges": ["18-24", "25-34"],
    "incomeLevel": ["medium"]
  }'::jsonb
),

-- Tech & Apps
(
  'Skillshare',
  'https://skillshare.com',
  '@skillshare',
  'Education',
  'Online Learning',
  'Learn creative skills online',
  5000,
  1000000,
  2.0,
  ARRAY['education', 'creative', 'art', 'design', 'business'],
  500,
  5000,
  'partners@skillshare.com',
  ARRAY['creative', 'inspiring', 'educational', 'modern'],
  ARRAY['tutorials', 'testimonials', 'process_videos'],
  ARRAY['creativity', 'learning', 'community', 'growth'],
  ARRAY['sponsored_post', 'affiliate', 'course_creation'],
  'Net 30',
  'leader',
  'steady',
  true,
  '{
    "locations": {
      "countries": ["USA", "UK", "Canada", "Australia"],
      "cities": ["New York", "San Francisco", "London", "Toronto"]
    },
    "ageRanges": ["25-34", "35-44"],
    "incomeLevel": ["medium"]
  }'::jsonb
),

(
  'Canva',
  'https://canva.com',
  '@canva',
  'Technology',
  'Design Software',
  'Design anything, publish anywhere',
  10000,
  1000000,
  2.5,
  ARRAY['business', 'creative', 'education', 'design'],
  1000,
  10000,
  'influencers@canva.com',
  ARRAY['colorful', 'creative', 'modern', 'accessible'],
  ARRAY['tutorials', 'templates', 'design_process'],
  ARRAY['creativity', 'empowerment', 'accessibility', 'innovation'],
  ARRAY['sponsored_post', 'ambassador', 'template_creation'],
  'Net 30',
  'leader',
  'rapid',
  true,
  '{
    "locations": {
      "countries": ["USA", "UK", "Australia", "Canada", "Brazil"],
      "cities": ["Sydney", "San Francisco", "London", "São Paulo"]
    },
    "ageRanges": ["25-34", "35-44"],
    "incomeLevel": ["medium", "high"]
  }'::jsonb
),

-- Fitness & Wellness
(
  'Gymshark',
  'https://gymshark.com',
  '@gymshark',
  'Fitness',
  'Athletic Wear',
  'Fitness apparel for ambitious athletes',
  5000,
  500000,
  3.5,
  ARRAY['fitness', 'gym', 'wellness', 'bodybuilding'],
  500,
  5000,
  'athletes@gymshark.com',
  ARRAY['athletic', 'motivational', 'strong', 'community'],
  ARRAY['workout_videos', 'transformation', 'outfit_posts'],
  ARRAY['ambition', 'community', 'progress', 'strength'],
  ARRAY['sponsored_post', 'ambassador', 'athlete_program'],
  'Net 30',
  'leader',
  'rapid',
  true,
  '{
    "locations": {
      "countries": ["USA", "UK", "Canada", "Australia"],
      "cities": ["Los Angeles", "Miami", "London", "Sydney", "Toronto"]
    },
    "ageRanges": ["18-24", "25-34"],
    "incomeLevel": ["medium"]
  }'::jsonb
),

(
  'Alo Yoga',
  'https://aloyoga.com',
  '@aloyoga',
  'Fitness',
  'Yoga Apparel',
  'Mindful movement and modern wellness',
  10000,
  1000000,
  4.0,
  ARRAY['yoga', 'wellness', 'mindfulness', 'luxury_fitness'],
  1000,
  10000,
  'influencer@aloyoga.com',
  ARRAY['minimal', 'zen', 'luxury', 'calming'],
  ARRAY['yoga_flows', 'outfit_posts', 'meditation'],
  ARRAY['mindfulness', 'wellness', 'community', 'sustainability'],
  ARRAY['sponsored_post', 'ambassador', 'studio_partnership'],
  'Net 45',
  'leader',
  'steady',
  true,
  '{
    "locations": {
      "countries": ["USA", "Canada", "UK"],
      "cities": ["Los Angeles", "New York", "Miami", "San Francisco"]
    },
    "ageRanges": ["25-34", "35-44"],
    "incomeLevel": ["high", "luxury"]
  }'::jsonb
),

-- Travel & Hospitality
(
  'Airbnb',
  'https://airbnb.com',
  '@airbnb',
  'Travel',
  'Accommodation',
  'Belong anywhere',
  20000,
  2000000,
  2.5,
  ARRAY['travel', 'adventure', 'lifestyle', 'photography'],
  2000,
  20000,
  'social@airbnb.com',
  ARRAY['authentic', 'adventurous', 'local', 'unique'],
  ARRAY['travel_content', 'property_tours', 'local_guides'],
  ARRAY['belonging', 'adventure', 'community', 'authenticity'],
  ARRAY['sponsored_post', 'experience_hosting', 'destination_campaign'],
  'Net 60',
  'leader',
  'steady',
  true,
  '{
    "locations": {
      "countries": ["USA", "UK", "France", "Japan", "Australia", "Canada", "UAE"],
      "cities": ["Paris", "London", "Tokyo", "Dubai", "New York", "Los Angeles"]
    },
    "ageRanges": ["25-34", "35-44"],
    "incomeLevel": ["medium", "high"]
  }'::jsonb
),

(
  'Away',
  'https://awaytravel.com',
  '@away',
  'Travel',
  'Luggage',
  'Thoughtful luggage for modern travel',
  10000,
  500000,
  3.0,
  ARRAY['travel', 'lifestyle', 'minimalist'],
  1000,
  5000,
  'partnerships@awaytravel.com',
  ARRAY['minimal', 'modern', 'sophisticated', 'functional'],
  ARRAY['travel_content', 'packing_videos', 'airport_shots'],
  ARRAY['design', 'functionality', 'adventure', 'quality'],
  ARRAY['sponsored_post', 'gifting', 'travel_campaign'],
  'Net 30',
  'challenger',
  'steady',
  true,
  '{
    "locations": {
      "countries": ["USA", "UK", "Canada"],
      "cities": ["New York", "Los Angeles", "Chicago", "London"]
    },
    "ageRanges": ["25-34", "35-44"],
    "incomeLevel": ["high"]
  }'::jsonb
)

ON CONFLICT (name) DO UPDATE SET
  verified = EXCLUDED.verified,
  last_updated = NOW();