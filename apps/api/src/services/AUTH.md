# Authentication & Authorization Documentation

## Overview

The authentication system provides secure JWT-based authentication for the task management tool. It includes:

- Email/password login with bcrypt password hashing
- JWT access tokens (15-minute expiration) and refresh tokens (7-day expiration)
- Token storage and revocation through database
- Role-based access control (RBAC) middleware
- Secure cookie-based refresh token storage for serverless deployment

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Authentication Flow                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Client                 API                  Database    │
│    │                     │                      │         │
│    ├──POST /login────────>                      │         │
│    │                     │ Verify password      │         │
│    │                     ├─────────────────────>│         │
│    │                     │ Create tokens        │         │
│    │                     ├─────────────────────>│         │
│    │<────tokens──────────│                      │         │
│    │                     │                      │         │
│    ├──POST /protected────>                      │         │
│    │ Bearer {accessToken}│ Verify token (JWT)   │         │
│    │<────response────────│                      │         │
│    │                     │                      │         │
│    ├──POST /refresh──────>                      │         │
│    │ {refreshToken}      │ Verify token exists  │         │
│    │                     ├─────────────────────>│         │
│    │<────new token───────│                      │         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Services

### PasswordService

Handles password hashing and verification using bcrypt with 10 salt rounds.

```typescript
const passwordService = new PasswordService();

// Hash password
const hash = await passwordService.hash("mypassword");

// Verify password
const isValid = await passwordService.verify("mypassword", hash);
```

### JwtService

Creates and verifies JWT tokens with claims for user identification.

```typescript
const jwtService = new JwtService();

// Generate token pair
const { accessToken, refreshToken } = jwtService.generateTokenPair(user);

// Verify token
const payload = jwtService.verifyToken(token);

// Check expiration
const isExpired = jwtService.isTokenExpired(token);

// Extract user ID
const userId = jwtService.extractUserId(token);
```

#### Token Payload Structure

```typescript
interface JwtPayload {
  userId: string;
  email: string;
  role: string;                    // PMO, PM, TEAM_MEMBER, CLIENT
  organisationId: string;
  type: "access" | "refresh";
  iat?: number;                     // Issued at (Unix timestamp)
  exp?: number;                     // Expiration (Unix timestamp)
}
```

### AuthService

Handles login, logout, token refresh, and user management.

```typescript
const authService = new AuthService();

// Login
const result = await authService.login({
  email: "user@example.com",
  password: "password123"
});
// Returns: { user, tokens: { accessToken, refreshToken } }

// Refresh access token
const newToken = await authService.refresh(refreshToken);

// Logout
await authService.logout(refreshToken);

// Create new user (PMO only)
const user = await authService.createUser({
  email: "newuser@example.com",
  name: "New User",
  password: "securepassword",
  role: "PM",
  organisationId: "org-123"
});

// Change password
await authService.changePassword(userId, oldPassword, newPassword);

// Logout from all devices
await authService.logoutAllDevices(userId);
```

## Middleware

### authMiddleware

Validates JWT token from Authorization header and attaches user info to request.

```typescript
app.get("/api/protected", authMiddleware, (req, res) => {
  // req.user is now available
  console.log(req.user.id, req.user.role);
});
```

**Expected Header:**
```
Authorization: Bearer <accessToken>
```

### requireRole

Restricts access to specific roles.

```typescript
app.post(
  "/api/admin",
  authMiddleware,
  requireRole("PMO"),
  handler
);

// Multiple roles
app.post(
  "/api/manage",
  authMiddleware,
  requireRole("PMO", "PM"),
  handler
);
```

### requireProjectAccess

Validates user has access to the project (for PM/TEAM_MEMBER roles).

```typescript
app.get(
  "/api/projects/:projectId/details",
  authMiddleware,
  requireProjectAccess,
  handler
);
```

### requireOrganisationAccess

Validates user has access to the organization.

```typescript
app.get(
  "/api/organisations/:organisationId",
  authMiddleware,
  requireOrganisationAccess,
  handler
);
```

### optionalAuthMiddleware

Authenticates if token is provided, but doesn't fail if missing.

```typescript
app.get("/api/public-project", optionalAuthMiddleware, (req, res) => {
  // req.user may or may not be available
});
```

## API Endpoints

### POST /api/auth/login

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PM",
    "organisationId": "org-123"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

**Cookies Set:**
- `refreshToken` (httpOnly, secure, 7-day expiration)

### POST /api/auth/logout

Logout and invalidate refresh token.

**Request:**
```
Headers: Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### POST /api/auth/refresh

Refresh the access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Refresh token has expired"
}
```

### GET /api/auth/me

Get current user information.

**Request:**
```
Headers: Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "PM",
  "organisationId": "org-123",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### POST /api/auth/change-password

Change user password.

**Request:**
```json
{
  "oldPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Response (400):**
```json
{
  "error": "Bad Request",
  "message": "Invalid password"
}
```

### POST /api/auth/logout-all-devices

Logout from all devices by invalidating all refresh tokens.

**Request:**
```
Headers: Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Logged out from all devices"
}
```

### POST /api/auth/users (PMO only)

Create a new user.

**Request:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "password": "securepassword123",
  "role": "PM",
  "organisationId": "org-123"
}
```

**Response (201):**
```json
{
  "id": "user-456",
  "email": "newuser@example.com",
  "name": "New User",
  "role": "PM",
  "organisationId": "org-123",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Security Features

### Password Security
- **Hashing Algorithm**: bcrypt with 10 salt rounds
- **Minimum Length**: Enforced at API level (8 characters)
- **Strength Requirements**: Recommended (not enforced at API)

### Token Security
- **Access Token**: 15-minute expiration (short-lived)
- **Refresh Token**: 7-day expiration (long-lived)
- **Refresh Token Storage**: Database + httpOnly cookie
- **Revocation**: Possible through refresh token deletion

### HTTP Security
- **CORS**: Configured with frontend origin
- **Cookies**: httpOnly flag to prevent XSS access
- **HTTPS**: Enforced in production via Secure flag

### Rate Limiting (Recommended)
Add rate limiting middleware to login endpoint:
```typescript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts
  message: "Too many login attempts"
});

app.post("/api/auth/login", loginLimiter, handler);
```

## Error Handling

### Common Errors

| Status | Error | Message |
|--------|-------|---------|
| 400 | Bad Request | Email and password are required |
| 400 | Bad Request | Password must be at least 8 characters |
| 401 | Unauthorized | Invalid email or password |
| 401 | Unauthorized | Missing or invalid authorization header |
| 401 | Unauthorized | Invalid or expired token |
| 403 | Forbidden | This action requires PMO role |
| 404 | Not Found | User not found |
| 409 | Conflict | User with this email already exists |
| 500 | Internal Server Error | Authentication failed |

## Environment Variables

```env
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development|production
FRONTEND_URL=http://localhost:3000
```

## Testing

Run authentication tests:

```bash
npm test -- auth.integration.test.ts
```

Tests cover:
- Login with valid/invalid credentials
- Token refresh and expiration
- Password changes
- Role-based access control
- Protected routes
- Token revocation on logout

## Best Practices

### For Frontend
1. Store access token in memory (not localStorage)
2. Use refresh tokens from httpOnly cookies
3. Implement auto-refresh before expiration
4. Handle 401 responses by redirecting to login
5. Clear all auth state on 403 responses

### For Backend
1. Always validate tokens before accessing protected routes
2. Check role permissions for sensitive operations
3. Use HTTPS in production
4. Rotate refresh tokens on each refresh
5. Implement token blacklisting for logout
6. Add rate limiting to auth endpoints
7. Log auth events for security monitoring

### For DevOps/Deployment
1. Use strong JWT_SECRET in production (minimum 32 characters)
2. Enable HTTPS and set Secure cookie flag
3. Configure CORS origins precisely
4. Monitor failed login attempts
5. Set up alerts for suspicious auth patterns
6. Regularly rotate credentials
7. Implement IP-based rate limiting

## Future Enhancements

1. **Multi-Factor Authentication (MFA)**: Add TOTP support
2. **OAuth Integration**: Support Google/Microsoft login
3. **Passwordless Auth**: Magic link or WebAuthn
4. **Session Management**: Track active sessions per user
5. **Device Fingerprinting**: Detect suspicious logins
6. **Audit Trail**: Detailed logging of auth events
7. **API Keys**: For service-to-service authentication
8. **SAML/LDAP**: Enterprise SSO integration
