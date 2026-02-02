# MindSpace - Teletherapy Platform

A production-ready teletherapy platform built with vanilla HTML/CSS/JavaScript and Supabase (Postgres + Auth). MindSpace connects patients with licensed therapists for online therapy sessions.

## Features

### For Clients (Patients)
- Browse and search approved therapists by specialization
- Book therapy sessions with preferred therapists
- Manage appointments (view, cancel, request reschedule)
- Join video sessions via secure meeting links
- Profile management with emergency contacts
- Dashboard with stats and filtering

### For Therapists
- Professional profile management
- Appointment management (confirm, reject, mark complete)
- Handle patient reschedule requests
- Suggest alternative session times
- Add session notes visible to patients
- Approval workflow for new therapists

### For Admins
- Platform statistics overview
- Approve/reject therapist applications
- Manage all therapists, patients, and bookings
- Revenue breakdown by therapist, specialization, and month
- Full CRUD operations

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Authentication**: Supabase Auth with session validation
- **Database**: PostgreSQL with Row Level Security (RLS)

## Project Structure

```
mindspace/
├── index.html              # Homepage with featured therapists
├── login.html              # User login
├── signup-user.html        # Client registration
├── signup-therapist.html   # Therapist registration
├── user-dashboard.html     # Client dashboard
├── therapist-dashboard.html # Therapist dashboard
├── admin-dashboard.html    # Admin dashboard
├── therapists.html         # Therapist directory
├── book-session.html       # Booking page
├── about.html              # About page
├── how-it-works.html       # How it works page
├── contact.html            # Contact page
├── faq.html                # FAQ page
├── privacy.html            # Privacy policy
├── terms.html              # Terms of service
├── style.css               # Main stylesheet
├── app.js                  # Supabase client and utilities
└── schema.sql              # Database schema and RLS policies
```

## Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note your project URL and anon key (Settings > API)

### 2. Configure Database Schema

1. Open the Supabase SQL Editor
2. Copy the contents of `schema.sql`
3. Run the SQL to create tables, indexes, triggers, and RLS policies

### 3. Update Configuration

1. Open `app.js`
2. Replace the placeholder values:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 4. Deploy

Upload all HTML, CSS, and JS files to your web server or hosting platform (Netlify, Vercel, etc.)

## Creating an Admin User

After setting up the project, follow these steps to create an admin:

1. Sign up as a regular user through the signup page
2. Go to Supabase SQL Editor
3. Run the following SQL (replace with your email):

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

4. Log out and log back in - you'll be redirected to the admin dashboard

## Database Schema

### profiles (lowercase)
Stores user and therapist profile information (extends Supabase Auth).

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | Primary key, references auth.users(id) |
| email | text | User's email address |
| role | text | 'user', 'therapist', or 'admin' |
| full_name | text | User's full name |
| phone | text | Phone number |
| date_of_birth | date | Date of birth |
| gender | text | Gender |
| city | text | City |
| address | text | Address |
| emergency_contact_name | text | Emergency contact name |
| emergency_contact_phone | text | Emergency contact phone |
| profile_picture_url | text | Profile picture URL |
| status | text | Account status |
| approved | boolean | Approval status |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### Therapists (Capital T)
Therapist-specific professional information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (same as auth user id) |
| user_id | uuid | References profiles(user_id) |
| Name | text | Therapist's name |
| email | text | Email address |
| phone | text | Phone number |
| Specialization | text | Area of specialization |
| fee | integer | Session fee |
| bio | text | Professional bio |
| experience | integer | Years of experience |
| license | text | License/qualifications |
| Active | boolean | Whether therapist is active |
| approval_status | text | 'pending', 'approved', or 'rejected' |
| created_at | timestamp | Creation timestamp |

### Bookings (Capital B)
Stores all therapy session bookings.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Patient's user ID |
| therapist_id | uuid | Therapist's ID |
| session_date | date | Session date |
| start_time | text | Session start time |
| end_time | text | Session end time |
| amount | integer | Session fee amount |
| status | text | 'pending', 'confirmed', 'completed', 'cancelled', 'rejected' |
| patient_name | text | Patient's name |
| patient_email | text | Patient's email |
| problem_description | text | Description of concerns |
| meeting_link | text | Video meeting URL |
| session_notes | text | Deprecated notes field |
| next_session_notes | text | Therapist notes visible to patient |
| reschedule_requested | boolean | Patient requested reschedule |
| reschedule_new_date | date | Proposed new date |
| reschedule_new_start_time | text | Proposed new time |
| reschedule_reason | text | Reason for reschedule request |
| therapist_reschedule_requested | boolean | Therapist suggested reschedule |
| therapist_reschedule_date | date | Therapist's suggested date |
| therapist_reschedule_time | text | Therapist's suggested time |
| therapist_reschedule_reason | text | Therapist's reason |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

## Row Level Security (RLS) Policies

### profiles
- Users can SELECT/UPDATE their own row
- Admins can SELECT/UPDATE all rows

### Therapists
- Public can SELECT approved and active therapists
- Therapists can SELECT/UPDATE their own row
- Admins can SELECT/UPDATE all rows

### Bookings
- Users can INSERT/SELECT/UPDATE their own bookings
- Therapists can SELECT/UPDATE bookings assigned to them
- Admins have full access

## Testing End-to-End Flows

### Client Flow
1. Sign up as a new user at `/signup-user.html`
2. Verify email (if enabled in Supabase)
3. Log in at `/login.html`
4. Browse therapists at `/therapists.html`
5. Book a session at `/book-session.html?therapist=ID`
6. Manage bookings in user dashboard

### Therapist Flow
1. Sign up as a therapist at `/signup-therapist.html`
2. Wait for admin approval
3. Once approved, log in to access therapist dashboard
4. Manage appointments and profile

### Admin Flow
1. Create admin via SQL (see above)
2. Log in to access admin dashboard
3. Approve pending therapist applications
4. View platform statistics and manage all data

## Security Considerations

1. **Authentication**: Always use `supabaseClient.auth.getUser()` to validate sessions
2. **RLS**: Database policies enforce access control at the row level
3. **HTTPS**: Meeting links must use HTTPS protocol
4. **Input Validation**: Client-side and server-side validation on all inputs
5. **Age Verification**: Therapists must be 18+ (enforced in signup)

## Environment Variables

For production deployment, consider using environment variables for:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## License

MIT License - See LICENSE file for details

## Support

For support, email support@mindspace.com or open an issue in the repository.
