# Masar - Task Management Tool

A comprehensive task management tool built with **Node.js + React + Vercel** for full serverless deployment.

## Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Express.js + Node.js + Prisma ORM
- **Database**: PostgreSQL (Vercel Postgres or Supabase)
- **Deployment**: Vercel (serverless)
- **Monorepo**: pnpm workspaces + Turborepo

## Project Structure

```
masar/
├── apps/
│   ├── frontend/          # React web app
│   └── api/               # Node.js API
├── packages/
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Shared utilities
│   └── schemas/           # Zod validation schemas
├── .github/workflows/     # CI/CD pipelines
└── vercel.json           # Vercel deployment config
```

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL (local or Vercel Postgres)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp apps/api/.env.example apps/api/.env.local

# Initialize database (Step 1.2)
cd apps/api
pnpm db:migrate

# Start development server
cd ../..
pnpm dev
```

The application will run:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Development Scripts

```bash
# Start all apps in dev mode
pnpm dev

# Build all apps
pnpm build

# Run all tests
pnpm test

# Run linting
pnpm lint

# Format code
pnpm format

# Type checking
pnpm type-check
```

## Vercel Deployment

### Setup

1. Create a Vercel account and project
2. Connect your GitHub repository
3. Configure environment variables:
   - `DATABASE_URL` - Vercel Postgres connection string
   - `REDIS_URL` - Vercel KV connection string
   - `JWT_SECRET` - Secret key for JWT tokens

4. Push to main branch to deploy

### Environment Variables

All environment variables are managed in Vercel dashboard:
- Production: Settings → Environment Variables
- Preview: Automatically inherited from production

## Development Phases

This project is built in 6 phases following test-driven development (TDD):

### Phase 1: Foundation & Core Infrastructure
- [x] Step 1.1: Project Structure & Basic Setup
- [ ] Step 1.2: Database Schema & Entity Foundation
- [ ] Step 1.3: Query Service Layer & Basic CRUD
- [ ] Step 1.4: Basic Security & Authentication Framework

### Phase 2: Domain Models & Business Logic
- [ ] Step 2.1: Calendar & Working Time Engine
- [ ] Step 2.2: Status Management & Lifecycle
- [ ] Step 2.3: Project Templates & Instantiation

### Phase 3: Scheduling Engine & Dependencies
- [ ] Step 3.1: Dependency Management System
- [ ] Step 3.2: Auto-Scheduling Engine
- [ ] Step 3.3: Manual Edit Constraints & Date Pickers

### Phase 4: Basic UI & Authentication
- [ ] Step 4.1: React Frontend Foundation
- [ ] Step 4.2: Authentication UI & User Management
- [ ] Step 4.3: Project Management UI Foundation

### Phase 5: Advanced UI Components
- [ ] Step 5.1: Dashboard & Analytics
- [ ] Step 5.2: Interactive Gantt Chart Integration
- [ ] Step 5.3: Kanban Board Implementation

### Phase 6: Import/Export & Polish
- [ ] Step 6.1: CSV Import/Export System
- [ ] Step 6.2: Microsoft Project (MPP) Integration
- [ ] Step 6.3: Notifications & Performance Polish

## Key Features

### Current Status
✅ Monorepo structure
✅ TypeScript end-to-end
✅ Vercel-ready configuration
✅ CI/CD pipeline

### Planned Features
- Project/Activity/Task hierarchy
- Dependency management (FS, SS, FF, SF)
- Auto-scheduling engine
- Working calendar integration
- Gantt chart visualization
- Kanban board
- CSV/MPP import/export
- Role-based access control
- Real-time collaboration

## Testing

Tests follow Test-Driven Development (TDD) principles:

```bash
# Run tests
pnpm test

# Run tests in UI mode
pnpm test:ui

# Run tests with coverage
pnpm test -- --coverage
```

Test coverage targets:
- Unit tests: >80%
- Integration tests: >70%
- E2E tests: Critical paths

## Code Quality

### Linting

```bash
# Run ESLint
pnpm lint

# Fix linting errors
pnpm lint --fix
```

### Formatting

```bash
# Format code with Prettier
pnpm format
```

### Type Checking

```bash
# Check TypeScript types
pnpm type-check
```

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Environment variable protection
- SQL injection protection via Prisma

## Performance

- Serverless auto-scaling (Vercel)
- Database connection pooling (Prisma)
- Edge middleware for auth (Vercel Edge Functions)
- Global CDN for static assets
- Code splitting and lazy loading
- API response caching

## Documentation

- See `prompt_plan.md` for detailed implementation plan
- See `spec.md` for feature specification
- See `apps/api/src` for API implementation
- See `apps/frontend/src` for frontend implementation

## License

MIT

## Contributing

See CONTRIBUTING.md (coming soon)

## Support

For issues and questions, please use GitHub Issues.
