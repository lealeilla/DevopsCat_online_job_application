const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { pool } = require('../db/init');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validation schema
const jobSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  location: Joi.string(),
  salary_range: Joi.string()
});

// POST - Create job (publisher only)
router.post('/', authenticateToken, requireRole('publisher'), async (req, res) => {
  try {
    const { error, value } = jobSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { title, description, location, salary_range } = value;
    const publisher_id = req.user.id;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO jobs (publisher_id, title, description, location, salary_range) VALUES (?, ?, ?, ?, ?)',
      [publisher_id, title, description, location, salary_range]
    );
    connection.release();

    res.status(201).json({
      message: 'Job created successfully',
      job: { id: result.insertId, ...value }
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// GET - List all open jobs
router.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [jobs] = await connection.query(`
      SELECT j.*, u.name as publisher_name
      FROM jobs j
      JOIN users u ON j.publisher_id = u.id
      WHERE j.status = 'open'
      ORDER BY j.created_at DESC
    `);
    connection.release();

    res.json(jobs);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET - Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [jobs] = await connection.query(`
      SELECT j.*, u.name as publisher_name
      FROM jobs j
      JOIN users u ON j.publisher_id = u.id
      WHERE j.id = ?
    `, [req.params.id]);
    connection.release();

    if (jobs.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(jobs[0]);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// PUT - Update job (publisher only, own jobs)
router.put('/:id', authenticateToken, requireRole('publisher'), async (req, res) => {
  try {
    const { error, value } = jobSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const connection = await pool.getConnection();
    const [jobs] = await connection.query('SELECT publisher_id FROM jobs WHERE id = ?', [req.params.id]);

    if (jobs.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobs[0].publisher_id !== req.user.id) {
      connection.release();
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await connection.query(
      'UPDATE jobs SET title = ?, description = ?, location = ?, salary_range = ? WHERE id = ?',
      [value.title, value.description, value.location, value.salary_range, req.params.id]
    );
    connection.release();

    res.json({ message: 'Job updated successfully' });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// DELETE - Close job (publisher only, own jobs)
router.delete('/:id', authenticateToken, requireRole('publisher'), async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [jobs] = await connection.query('SELECT publisher_id FROM jobs WHERE id = ?', [req.params.id]);

    if (jobs.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobs[0].publisher_id !== req.user.id) {
      connection.release();
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await connection.query('UPDATE jobs SET status = ? WHERE id = ?', ['closed', req.params.id]);
    connection.release();

    res.json({ message: 'Job closed successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to close job' });
  }
});

module.exports = router;
