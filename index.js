#!/usr/bin/env node
const { start } = require('./src/server');

const port = process.env.PORT || 3000;
start(port);
