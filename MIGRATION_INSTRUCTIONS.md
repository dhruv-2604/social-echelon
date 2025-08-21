# Database Migration Instructions for Authentication

## How to Run the Authentication Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor tab

2. **Run the Migration**
   - Copy the entire contents of `add-auth-columns.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the migration

3. **Verify the Migration**
   After running the migration, you should see:
   - New columns added to the `profiles` table:
     - `password_hash` (TEXT)
     - `phone` (VARCHAR(20))
     - `subscription_plan` (VARCHAR(20))
     - `billing_cycle` (VARCHAR(20))
     - `stripe_customer_id` (TEXT)
     - `stripe_subscription_id` (TEXT)
   - New indexes created for faster lookups:
     - `idx_profiles_email` on email column
     - `idx_profiles_instagram_username` on instagram_username column

## Testing the Authentication Flow

After running the migration:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test Signup:**
   - Visit http://localhost:3000/auth/signup
   - Fill in all required fields:
     - Full Name
     - Email Address
     - Instagram Handle
     - Phone Number
     - Password (must contain uppercase, lowercase, number, and special character)
   - Select a plan (Balance or Harmony)
   - Complete the signup process

3. **Test Login:**
   - Visit http://localhost:3000/auth/login
   - Enter your email and password
   - You should be redirected to either:
     - `/auth/connect` if Instagram is not connected
     - `/dashboard` if everything is set up

## What's Working Now

✅ **Signup Flow:**
- User registration with strong password requirements
- Password matching validation
- Email and Instagram handle uniqueness checks
- Secure password hashing with bcryptjs
- Session cookie creation

✅ **Login Flow:**
- Email/password authentication
- Session management with httpOnly cookies
- Redirect logic based on Instagram connection status
- Error handling for invalid credentials

✅ **Security Features:**
- Password strength validation (8+ chars, uppercase, lowercase, number, special char)
- Password confirmation matching
- Secure password hashing
- HttpOnly cookies for session management
- Input validation for all fields

## Next Steps

1. **Stripe Integration** (pending):
   - Set up Stripe webhook endpoints
   - Implement payment processing in the signup flow
   - Update subscription status after successful payment

2. **Instagram Connection**:
   - Already implemented at `/auth/connect`
   - Users are redirected here after login if Instagram is not connected

3. **Dashboard Access**:
   - Protected routes already check for authentication
   - Users can only access dashboard after successful login

## Troubleshooting

If you encounter issues:

1. **"Email already exists" error:**
   - The email is already registered in the database
   - Try logging in instead or use a different email

2. **"Invalid password" error during signup:**
   - Ensure password meets all requirements:
     - At least 8 characters
     - Contains uppercase letter (A-Z)
     - Contains lowercase letter (a-z)
     - Contains number (0-9)
     - Contains special character (!@#$%^&*)

3. **Build errors:**
   - Make sure bcryptjs is installed: `npm install bcryptjs`
   - Run `npm run build` to verify everything compiles

4. **Database errors:**
   - Ensure the migration has been run successfully
   - Check that all columns exist in the profiles table
   - Verify Supabase connection in `.env.local`