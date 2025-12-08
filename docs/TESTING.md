# Testing Guide

This document explains how to run tests for the Online Job Application Tracker at different environments.

## Quick Start

### Health Check Only (1-2 seconds)
For a quick sanity check without database:

```bash
SKIP_DB_TESTS=true npm test
```

This runs only the `/health` endpoint test, useful for CI pipelines that just need a sanity check.

### Full Integration Tests

#### Option 1: Run inside Docker container (recommended)
This ensures the test process has network access to MySQL via the Docker bridge network:

```bash
docker-compose up -d                  # Start containers if not running
docker-compose exec app npm test      # Run tests inside app container
```

#### Option 2: Run locally (requires MySQL on localhost:3306)
If you have MySQL running locally or exposed to localhost:

```bash
docker-compose up -d                  # Ensure MySQL is running
npm test                              # Run all tests on local machine
```

**Note:** The local machine approach may timeout if MySQL takes time to start. The Docker container approach is more reliable.

## Test Structure

### Test Files

- **`test/app.test.js`**: Health endpoint test (always runs)
  - Tests: 1
  - Coverage: 100% of app.js

- **`test/applications.test.js`**: Multi-role integration tests (skipped if `SKIP_DB_TESTS=true`)
  - **Health Check section**: 1 test (always runs)
  - **Multi-Role API section**: 20+ tests
    - Auth Routes: Register, login, validation
    - Jobs Routes: Create, list, view (publisher-only)
    - Applications Routes: Apply, view, update status (role-based access)

### Test Coverage

When running full integration tests:
- `src/app.js`: 100% coverage
- `src/routes/health.js`: 100% coverage
- `src/routes/auth.js`: ~38% coverage (only register/login tested)
- `src/routes/jobs.js`: ~17% coverage
- `src/routes/applications.js`: ~18% coverage
- `src/db/init.js`: ~54% coverage

## Test Data

Tests create unique users and jobs using timestamps to avoid conflicts:
- Each test run creates 3 users (publisher, applicant, approver)
- Each test run creates 1 job
- Email format: `{role}-{timestamp}@test.example.com`

This allows tests to run multiple times without "duplicate email" errors.

## Continuous Integration

### GitHub Actions (`.github/workflows/ci.yml`)

The CI workflow:
1. Spins up a MySQL 8.0 service
2. Waits for MySQL to be healthy (30s timeout, 5 retries)
3. Installs dependencies (`npm ci`)
4. Runs full integration tests (`npm test` with `SKIP_DB_TESTS=false`)
5. Builds Docker image (main branch only)
6. Sends Slack notification (if webhook configured)

**Environment variables in CI:**
- `DB_HOST=127.0.0.1` (GitHub Actions MySQL service)
- `DB_USER=root`
- `DB_PASSWORD=password`
- `DB_NAME=job_tracker`

## Troubleshooting

### Tests timeout locally
If tests hang on `beforeAll`, the MySQL connection is likely timing out:

```bash
# Use the Docker container approach instead:
docker-compose exec app npm test
```

### "already applied" test failures
This means a previous test run left data in the database. The test suite uses timestamps to prevent this, but if you see failures:

```bash
# Option 1: Clear database
docker-compose down -v                # Remove volumes
docker-compose up -d                  # Restart fresh

# Option 2: Run tests in container (uses same DB but isolated test runs)
docker-compose exec app npm test
```

### Connection refused errors
The app/test process can't reach MySQL. Check:

```bash
# Verify MySQL is running:
docker ps | grep mysql

# Verify MySQL is responsive:
mysql -h127.0.0.1 -uroot -ppassword job_tracker -e "SELECT 1;"

# If using Docker container for tests:
docker-compose exec app mysql -hmysql -uroot -ppassword job_tracker -e "SELECT 1;"
```

## Performance Notes

- Health check only: ~2.7s
- Full integration tests (with MySQL): ~90-120s (depending on system)
- GitHub Actions CI: ~2-3 minutes (including dependency installation and Docker build)

## Adding New Tests

When adding tests to `test/applications.test.js`:

1. If it requires database: add inside the `if (!SKIP_DB_TESTS)` block
2. If it's just HTTP validation: can go in the main Health Check section
3. Use the same `timestamp` and `email()` function for unique test data
4. Remember role-based access: use appropriate tokens (`publisherToken`, `applicantToken`, `approverToken`)

Example:

```javascript
test('New feature - something', async () => {
  const res = await request(app)
    .post('/api/path')
    .set('Authorization', `Bearer ${publisherToken}`)
    .send({ data: 'test' });

  expect(res.statusCode).toBe(expectedStatus);
  expect(res.body).toHaveProperty('expectedField');
});
```
