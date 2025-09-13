# Task Management Tool

Enterprise Task Management Tool with Project, Activity, and Task hierarchy supporting auto-scheduling, dependency management, and comprehensive import/export functionality.

## Architecture Overview

**Backend**: Java 17 + Spring Boot 3.x + PostgreSQL + MPXJ  
**Frontend**: React + TypeScript + React Query (to be implemented)  
**Key Features**: Project/Activity/Task hierarchy, Dependencies, Auto-scheduling, Gantt/Kanban UI, MPP/CSV import/export

## Project Structure

This is a multi-module Maven project with the following modules:

- **core-domain**: Core domain entities, repositories, and services
- **scheduling-engine**: Auto-scheduling engine and dependency management
- **web-api**: REST API controllers and web configuration
- **import-export**: CSV and MPP file import/export functionality

## Prerequisites

- Java 17 or higher
- Maven 3.8+
- PostgreSQL 12+ (for development)
- Docker (optional, for running PostgreSQL in container)

## Quick Start

### 1. Database Setup

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL and create database
sudo -u postgres psql
CREATE DATABASE taskmanagement_dev;
CREATE USER taskmanagement WITH PASSWORD 'taskmanagement';
GRANT ALL PRIVILEGES ON DATABASE taskmanagement_dev TO taskmanagement;
```

#### Option B: Docker PostgreSQL
```bash
docker run --name postgres-taskmanagement \
  -e POSTGRES_DB=taskmanagement_dev \
  -e POSTGRES_USER=taskmanagement \
  -e POSTGRES_PASSWORD=taskmanagement \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### 2. Build and Run

```bash
# Clone the repository
git clone <repository-url>
cd task-management-tool

# Build all modules
mvn clean install

# Run the application
mvn spring-boot:run -pl web-api

# Or run with specific profile
mvn spring-boot:run -pl web-api -Dspring-boot.run.profiles=dev
```

The application will be available at:
- API: http://localhost:8080/api
- Swagger UI: http://localhost:8080/api/swagger-ui.html
- API Docs: http://localhost:8080/api/api-docs

### 3. Testing

```bash
# Run all tests
mvn test

# Run tests for specific module
mvn test -pl core-domain

# Run with coverage
mvn test jacoco:report
```

## Development Profiles

### Development (`dev`)
- Uses local PostgreSQL database
- SQL logging enabled
- Detailed debug logging
- H2 console disabled

### Test (`test`)  
- Uses H2 in-memory database
- Test containers for integration tests
- Liquibase disabled (uses JPA schema generation)
- Enhanced debug logging

### Production (`prod`)
- Uses environment variables for database configuration
- Minimal logging
- Security headers enabled
- Performance optimizations

## Environment Variables (Production)

```bash
DATABASE_URL=jdbc:postgresql://localhost:5432/taskmanagement
DATABASE_USERNAME=taskmanagement
DATABASE_PASSWORD=your-secure-password
SPRING_PROFILES_ACTIVE=prod
```

## API Documentation

Once the application is running, you can access:

- **Swagger UI**: http://localhost:8080/api/swagger-ui.html
- **OpenAPI JSON**: http://localhost:8080/api/api-docs

## Module Details

### Core Domain (`core-domain`)
Contains the fundamental business entities and data access layer:
- Domain entities (Project, Activity, Task, etc.)
- Repository interfaces
- Core business services
- Data validation and constraints

### Scheduling Engine (`scheduling-engine`)
Handles complex scheduling logic:
- Dependency management and cycle detection
- Working calendar integration
- Auto-scheduling algorithms
- Constraint resolution

### Web API (`web-api`)
REST API layer and web configuration:
- REST controllers
- Security configuration
- API documentation setup
- Main application class

### Import/Export (`import-export`)
File processing capabilities:
- CSV import/export with full validation
- Microsoft Project (MPP) integration using MPXJ
- Data transformation and mapping
- Error handling and reporting

## Testing Strategy

- **Unit Tests**: Each module has comprehensive unit tests
- **Integration Tests**: Database integration using TestContainers
- **API Tests**: REST endpoint testing with MockMvc
- **Performance Tests**: Load testing for critical paths

## Security

- JWT-based authentication (to be implemented)
- Role-based access control (PMO, PM, TEAM_MEMBER, CLIENT)
- Method-level security
- CORS configuration for frontend integration

## Database Migrations

Uses Liquibase for database schema management:
- Migration scripts in `src/main/resources/db/changelog/`
- Automatic migration on application startup
- Environment-specific migrations supported

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Roadmap

See `prompt_plan.md` for the detailed development plan and implementation roadmap.

## Support

For questions or issues, please create an issue in the GitHub repository or contact the development team.

## License

This project is proprietary software. All rights reserved.