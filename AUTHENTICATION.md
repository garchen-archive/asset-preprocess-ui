# Authentication Setup

This application uses NextAuth.js for authentication with database-backed user management.

Users are stored in PostgreSQL and managed via database migrations in the Go app.

## Default User

The application creates a default admin user during setup:

| Username | Password | Role | Email |
|----------|----------|------|-------|
| admin | LetsGetGoing! | admin | admin@garchen.org |

**⚠️ IMPORTANT: Change this password in production!**

## Database Schema

Authentication uses three tables:

- **`users`** - User profiles (compatible with OAuth providers)
- **`accounts`** - OAuth provider accounts (Auth0, Google, GitHub, etc.)
- **`credentials`** - Local username/password authentication

This structure allows for both local authentication and future OAuth integration.

## Adding New Users

### Using the Seed Script

```bash
# Add or update admin user with custom password
DATABASE_URL="postgresql://garchen_user:changeme@localhost:5432/garchen_archive" \
  npx tsx scripts/seed-users.ts "YourNewPassword"
```

### Manually via Database

```sql
-- 1. Insert user
INSERT INTO users (name, email, role)
VALUES ('New User', 'user@example.com', 'editor')
RETURNING id;

-- 2. Generate password hash (use bcrypt with cost 10)
-- Then insert credentials
INSERT INTO credentials (user_id, username, password)
VALUES ('user-id-from-step-1', 'newuser', '$2b$10$...');
```

### Generate Password Hash

```bash
node scripts/generate-password.js "your-password"
```

## User Roles

Currently supported roles:
- **admin**: Full access to all features
- **editor**: Standard access (can be customized later)

## Environment Variables

Required environment variables:

```env
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-key"

# URL where the app is hosted
NEXTAUTH_URL="http://localhost:3000"

# User credentials (JSON array)
AUTH_USERS='[{"id":"1","name":"Admin","username":"admin","password":"$2b$10$...","role":"admin"}]'
```

## Vercel Deployment

When deploying to Vercel, add these environment variables in Project Settings → Environment Variables:

1. **NEXTAUTH_SECRET** - Generate a new one for production: `openssl rand -base64 32`
2. **NEXTAUTH_URL** - Your production URL (e.g., `https://your-app.vercel.app`)
3. **AUTH_USERS** - Your production users JSON (generate new password hashes!)
4. **DATABASE_URL** - Your PostgreSQL connection string

**Security Tips for Production**:
- Generate new password hashes for all users
- Use strong, unique passwords
- Never reuse development credentials in production
- Keep AUTH_USERS as a secret environment variable

## Security Best Practices

1. **Change default passwords** before deploying to production
2. **Use strong passwords** for all accounts
3. **Generate a new NEXTAUTH_SECRET** for production
4. **Consider moving users to a database** for production use
5. **Enable HTTPS** in production (automatic on Vercel)

## Future Enhancements

Consider these improvements for production:

- Store users in the database
- Add password reset functionality
- Implement role-based access control (RBAC)
- Add email verification
- Enable two-factor authentication (2FA)
- Add OAuth providers (Google, GitHub, etc.)
