const request = require('supertest');
const app = require('../src/app');

describe('Multi-Role Job Application Tracker API', () => {
  let publisherToken, applicantToken, approverToken;
  let publisherId, applicantId, jobId;

  beforeAll(async () => {
    // Register publisher
    const pubRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'publisher@example.com',
        password: 'password123',
        name: 'Job Publisher',
        role: 'publisher'
      });
    publisherToken = pubRes.body.token;
    publisherId = pubRes.body.user.id;

    // Register applicant
    const appRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'applicant@example.com',
        password: 'password123',
        name: 'Job Applicant',
        role: 'applicant'
      });
    applicantToken = appRes.body.token;
    applicantId = appRes.body.user.id;

    // Register approver
    const apvRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'approver@example.com',
        password: 'password123',
        name: 'Job Approver',
        role: 'approver'
      });
    approverToken = apvRes.body.token;
  });

  describe('Auth Routes', () => {
    test('POST /api/auth/register creates a new user with role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          role: 'applicant'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('applicant');
    });

    test('POST /api/auth/login returns token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'publisher@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('publisher');
    });

    test('POST /api/auth/login rejects invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'publisher@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Jobs Routes (Publisher)', () => {
    test('POST /api/jobs creates a new job (publisher only)', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${publisherToken}`)
        .send({
          title: 'Senior Developer',
          description: 'We are hiring a senior developer',
          location: 'San Francisco',
          salary_range: '$100k-$150k'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.job.title).toBe('Senior Developer');
      jobId = res.body.job.id;
    });

    test('POST /api/jobs rejects non-publisher', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          title: 'Test Job',
          description: 'Test',
          location: 'NYC'
        });

      expect(res.statusCode).toBe(403);
    });

    test('GET /api/jobs returns all open jobs', async () => {
      const res = await request(app).get('/api/jobs');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('publisher_name');
    });

    test('GET /api/jobs/:id returns specific job', async () => {
      const res = await request(app).get(`/api/jobs/${jobId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Senior Developer');
      expect(res.body.id).toBe(jobId);
    });
  });

  describe('Applications Routes (Applicant)', () => {
    test('POST /api/applications allows applicant to apply for job', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          job_id: jobId,
          cover_letter: 'I am very interested in this position'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.application).toHaveProperty('id');
      expect(res.body.application.status).toBe('pending');
    });

    test('POST /api/applications rejects duplicate applications', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          job_id: jobId,
          cover_letter: 'Another application'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('already applied');
    });

    test('GET /api/applications/my-applications returns applicant applications', async () => {
      const res = await request(app)
        .get('/api/applications/my-applications')
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('status');
    });

    test('GET /api/applications/my-applications requires auth', async () => {
      const res = await request(app).get('/api/applications/my-applications');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Applications Routes (Publisher view)', () => {
    test('GET /api/applications/job/:id returns applications for publisher job', async () => {
      const res = await request(app)
        .get(`/api/applications/job/${jobId}`)
        .set('Authorization', `Bearer ${publisherToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('applicant_name');
      expect(res.body[0]).toHaveProperty('status');
    });

    test('GET /api/applications/job/:id prevents non-publisher access', async () => {
      const res = await request(app)
        .get(`/api/applications/job/${jobId}`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Applications Routes (Approver)', () => {
    let applicationId;

    beforeAll(async () => {
      const appRes = await request(app)
        .get('/api/applications/my-applications')
        .set('Authorization', `Bearer ${applicantToken}`);
      applicationId = appRes.body[0].id;
    });

    test('PUT /api/applications/:id/status updates application status (approver only)', async () => {
      const res = await request(app)
        .put(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          status: 'received'
        });

      expect(res.statusCode).toBe(200);
    });

    test('PUT /api/applications/:id/status with rejection reason', async () => {
      // Create another applicant to test rejection
      const newAppRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'applicant2@example.com',
          password: 'password123',
          name: 'Second Applicant',
          role: 'applicant'
        });
      const newApplicantToken = newAppRes.body.token;

      // Apply for job
      const applyRes = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${newApplicantToken}`)
        .send({
          job_id: jobId,
          cover_letter: 'I want this job'
        });
      const appId = applyRes.body.application.id;

      // Reject with reason
      const rejectRes = await request(app)
        .put(`/api/applications/${appId}/status`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          status: 'rejected',
          rejection_reason: 'Not enough experience'
        });

      expect(rejectRes.statusCode).toBe(200);
    });

    test('PUT /api/applications/:id/status rejects non-approver', async () => {
      const res = await request(app)
        .put(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          status: 'selected'
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Health Check', () => {
    test('GET /health returns ok status', async () => {
      const res = await request(app).get('/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
