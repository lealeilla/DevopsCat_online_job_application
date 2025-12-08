const request = require('supertest');
const app = require('../src/app');
const store = require('../src/store/applications');

describe('Applications API', () => {
  // Clear store before each test
  beforeEach(() => {
    store.getApplications().length = 0; // Clear array
  });

  describe('GET /api/applications', () => {
    test('returns empty array initially', async () => {
      const res = await request(app).get('/api/applications');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns all applications', async () => {
      await request(app).post('/api/applications').send({
        company: 'Google',
        position: 'Software Engineer',
        appliedDate: '2025-12-08',
        status: 'applied'
      });

      const res = await request(app).get('/api/applications');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].company).toBe('Google');
    });
  });

  describe('POST /api/applications', () => {
    test('creates a new application with required fields', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          company: 'Google',
          position: 'Software Engineer',
          appliedDate: '2025-12-08',
          status: 'applied'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.company).toBe('Google');
      expect(res.body.position).toBe('Software Engineer');
      expect(res.body.status).toBe('applied');
    });

    test('creates application with optional fields', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          company: 'Microsoft',
          position: 'Cloud Architect',
          appliedDate: '2025-12-08',
          status: 'interviewing',
          link: 'https://example.com/job',
          notes: 'Great opportunity'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.link).toBe('https://example.com/job');
      expect(res.body.notes).toBe('Great opportunity');
    });

    test('rejects missing required fields', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          company: 'Google'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('rejects invalid status', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({
          company: 'Google',
          position: 'Software Engineer',
          appliedDate: '2025-12-08',
          status: 'invalid_status'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid status');
    });
  });

  describe('GET /api/applications/:id', () => {
    test('returns application by ID', async () => {
      const postRes = await request(app)
        .post('/api/applications')
        .send({
          company: 'Amazon',
          position: 'DevOps Engineer',
          appliedDate: '2025-12-08',
          status: 'applied'
        });

      const id = postRes.body.id;
      const res = await request(app).get(`/api/applications/${id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.company).toBe('Amazon');
    });

    test('returns 404 for non-existent ID', async () => {
      const res = await request(app).get('/api/applications/999');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/applications/:id', () => {
    test('deletes application by ID', async () => {
      const postRes = await request(app)
        .post('/api/applications')
        .send({
          company: 'Meta',
          position: 'Frontend Engineer',
          appliedDate: '2025-12-08',
          status: 'applied'
        });

      const id = postRes.body.id;
      const deleteRes = await request(app).delete(`/api/applications/${id}`);

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body).toHaveProperty('message');

      const getRes = await request(app).get(`/api/applications/${id}`);
      expect(getRes.statusCode).toBe(404);
    });

    test('returns 404 when deleting non-existent application', async () => {
      const res = await request(app).delete('/api/applications/999');
      expect(res.statusCode).toBe(404);
    });
  });
});
