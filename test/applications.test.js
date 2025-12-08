/**
 * Multi-Role Job Application Tracker - Integration Tests
 * 
 * Run locally:
 *   docker-compose up -d           # Start MySQL
 *   SKIP_DB_TESTS=true npm test    # Skip DB tests (health check only)
 *   npm test                        # Run all tests (requires MySQL on localhost:3306)
 * 
 * Or run inside Docker container (recommended for full tests):
 *   docker-compose exec app npm test
 */

const request = require('supertest');
const app = require('../src/app');

// Skip database tests if running on host without network access to MySQL
const SKIP_DB_TESTS = process.env.SKIP_DB_TESTS === 'true';

describe('Health Check', () => {
  test('GET /health returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

if (!SKIP_DB_TESTS) {
  const { initializeDatabase } = require('../src/db/init');

  describe('Multi-Role API Integration Tests', () => {
    // Initialize database before running integration tests
    beforeAll(async () => {
      try {
        await initializeDatabase();
        console.log('✓ Database initialized for tests');
      } catch (error) {
        console.error('Failed to initialize database:', error.message);
        throw error;
      }
    }, 120000); // 120s timeout for DB initialization

    let publisherToken, applicantToken, approverToken;
    let jobId, applicationId;

    const timestamp = Date.now();
    const email = (role) => `${role}-${timestamp}@test.example.com`;

    describe('Auth Routes', () => {
      test('POST /api/auth/register - publisher', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: email('publisher'),
            password: 'SecurePass123!',
            name: 'Test Publisher',
            role: 'publisher'
          });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.role).toBe('publisher');
        publisherToken = res.body.token;
      });

      test('POST /api/auth/register - applicant', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: email('applicant'),
            password: 'SecurePass123!',
            name: 'Test Applicant',
            role: 'applicant'
          });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.role).toBe('applicant');
        applicantToken = res.body.token;
      });

      test('POST /api/auth/register - approver', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: email('approver'),
            password: 'SecurePass123!',
            name: 'Test Approver',
            role: 'approver'
          });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.role).toBe('approver');
        approverToken = res.body.token;
      });

      test('POST /api/auth/login - successful', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: email('publisher'),
            password: 'SecurePass123!'
          });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
      });

      test('POST /api/auth/login - invalid password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: email('publisher'),
            password: 'WrongPassword'
          });

        expect(res.statusCode).toBe(400);
      });
    });

    describe('Jobs Routes', () => {
      test('POST /api/jobs - create job (publisher only)', async () => {
        const res = await request(app)
          .post('/api/jobs')
          .set('Authorization', `Bearer ${publisherToken}`)
          .send({
            title: `Senior Developer - ${timestamp}`,
            description: 'Join our engineering team',
            location: 'San Francisco, CA',
            salary_range: '$120k-$160k'
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.job.title).toContain('Senior Developer');
        jobId = res.body.job.id;
      });

      test('POST /api/jobs - reject non-publisher', async () => {
        const res = await request(app)
          .post('/api/jobs')
          .set('Authorization', `Bearer ${applicantToken}`)
          .send({
            title: 'Unauthorized Job',
            description: 'Test',
            location: 'NYC'
          });

        expect(res.statusCode).toBe(403);
      });

      test('GET /api/jobs - list all jobs', async () => {
        const res = await request(app).get('/api/jobs');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      test('GET /api/jobs/:id - view specific job', async () => {
        const res = await request(app).get(`/api/jobs/${jobId}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(jobId);
      });
    });

    describe('Applications Routes', () => {
      test('POST /api/applications - applicant applies for job', async () => {
        const res = await request(app)
          .post('/api/applications')
          .set('Authorization', `Bearer ${applicantToken}`)
          .send({
            job_id: jobId,
            cover_letter: 'I am very interested in this role'
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.application).toHaveProperty('id');
        applicationId = res.body.application.id;
      });

      test('POST /api/applications - prevent duplicate applications', async () => {
        const res = await request(app)
          .post('/api/applications')
          .set('Authorization', `Bearer ${applicantToken}`)
          .send({
            job_id: jobId,
            cover_letter: 'Another attempt'
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('already applied');
      });

      test('GET /api/applications/my-applications - applicant views own applications', async () => {
        const res = await request(app)
          .get('/api/applications/my-applications')
          .set('Authorization', `Bearer ${applicantToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      test('GET /api/applications/my-applications - require auth', async () => {
        const res = await request(app).get('/api/applications/my-applications');

        expect(res.statusCode).toBe(401);
      });

      test('GET /api/applications/job/:id - publisher views job applications', async () => {
        const res = await request(app)
          .get(`/api/applications/job/${jobId}`)
          .set('Authorization', `Bearer ${publisherToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      test('GET /api/applications/job/:id - applicant cannot view', async () => {
        const res = await request(app)
          .get(`/api/applications/job/${jobId}`)
          .set('Authorization', `Bearer ${applicantToken}`);

        expect(res.statusCode).toBe(403);
      });

      test('PUT /api/applications/:id/status - approver updates status', async () => {
        const res = await request(app)
          .put(`/api/applications/${applicationId}/status`)
          .set('Authorization', `Bearer ${approverToken}`)
          .send({ status: 'reviewed' });

        expect(res.statusCode).toBe(200);
      });

      test('PUT /api/applications/:id/status - applicant cannot update', async () => {
        const res = await request(app)
          .put(`/api/applications/${applicationId}/status`)
          .set('Authorization', `Bearer ${applicantToken}`)
          .send({ status: 'selected' });

        expect(res.statusCode).toBe(403);
      });
    });
  });
}
