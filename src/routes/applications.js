const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { pool } = require('../db/init');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validation schema
const applicationSchema = Joi.object({
  job_id: Joi.number().required(),
  cover_letter: Joi.string(),
  resume_url: Joi.string().uri()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('received', 'interview', 'selected', 'rejected').required(),
  rejection_reason: Joi.string(),
  approver_id: Joi.number()
});

// POST - Apply for job (applicant only)
router.post('/', authenticateToken, requireRole('applicant'), async (req, res) => {
  try {
    const { error, value } = applicationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { job_id, cover_letter, resume_url } = value;
    const applicant_id = req.user.id;

    const connection = await pool.getConnection();

    // Check if job exists
    const [jobs] = await connection.query('SELECT id FROM jobs WHERE id = ? AND status = ?', [job_id, 'open']);
    if (jobs.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Job not found or is closed' });
    }

    // Check if already applied
    const [existing] = await connection.query(
      'SELECT id FROM applications WHERE job_id = ? AND applicant_id = ?',
      [job_id, applicant_id]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    // Create application
    const [result] = await connection.query(
      'INSERT INTO applications (job_id, applicant_id, cover_letter, resume_url, status) VALUES (?, ?, ?, ?, ?)',
      [job_id, applicant_id, cover_letter, resume_url, 'pending']
    );

    connection.release();

    res.status(201).json({
      message: 'Application submitted successfully',
      application: { id: result.insertId, job_id, applicant_id, status: 'pending' }
    });
  } catch (error) {
    console.error('Apply job error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// GET - My applications (applicant)
router.get('/my-applications', authenticateToken, requireRole('applicant'), async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [applications] = await connection.query(`
      SELECT a.*, j.title, j.description, j.location, u.name as publisher_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON j.publisher_id = u.id
      WHERE a.applicant_id = ?
      ORDER BY a.created_at DESC
    `, [req.user.id]);

    connection.release();
    res.json(applications);
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET - Applications for job (publisher)
router.get('/job/:job_id', authenticateToken, requireRole('publisher'), async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Verify job belongs to publisher
    const [jobs] = await connection.query('SELECT publisher_id FROM jobs WHERE id = ?', [req.params.job_id]);
    if (jobs.length === 0 || jobs[0].publisher_id !== req.user.id) {
      connection.release();
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [applications] = await connection.query(`
      SELECT a.*, u.name as applicant_name, u.email as applicant_email
      FROM applications a
      JOIN users u ON a.applicant_id = u.id
      WHERE a.job_id = ?
      ORDER BY a.created_at DESC
    `, [req.params.job_id]);

    connection.release();
    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// PUT - Update application status (approver only)
router.put('/:id/status', authenticateToken, requireRole('approver'), async (req, res) => {
  try {
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { status, rejection_reason } = value;
    const approver_id = req.user.id;

    const connection = await pool.getConnection();

    // Check if application exists
    const [apps] = await connection.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (apps.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update status
    await connection.query(
      'UPDATE applications SET status = ?, approver_id = ?, rejection_reason = ? WHERE id = ?',
      [status, approver_id, rejection_reason || null, req.params.id]
    );

    connection.release();

    res.json({ message: 'Application status updated successfully' });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

module.exports = router;
