const express = require('express');
const app = express();
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const jobsRouter = require('./routes/jobs');
const applicationsRouter = require('./routes/applications');

app.use(express.json());
app.use(express.static('public'));
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/applications', applicationsRouter);

module.exports = app;
