const express = require('express');
const router = express.Router();
const store = require('../store/applications');

// GET all applications
router.get('/', (req, res) => {
  const apps = store.getApplications();
  res.json(apps);
});

// POST new application
router.post('/', (req, res) => {
  const { company, position, link, appliedDate, status, notes } = req.body;

  // Validation
  if (!company || !position || !appliedDate || !status) {
    return res.status(400).json({
      error: 'Missing required fields: company, position, appliedDate, status'
    });
  }

  const validStatuses = ['applied', 'interviewing', 'offer', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const app = store.addApplication({ company, position, link, appliedDate, status, notes });
  res.status(201).json(app);
});

// GET application by ID
router.get('/:id', (req, res) => {
  const app = store.getApplicationById(req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'Application not found' });
  }
  res.json(app);
});

// DELETE application
router.delete('/:id', (req, res) => {
  const app = store.deleteApplication(req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'Application not found' });
  }
  res.json({ message: 'Application deleted', app });
});

module.exports = router;
