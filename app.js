/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

require('dotenv').config();                     // Optional: for local .env
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// ---------------------------------------------------------------------
// 1. Import messages module (which handles MongoDB connection)
// ---------------------------------------------------------------------
const messages = require('./routes/messages');

// ---------------------------------------------------------------------
// 2. Connect to MongoDB **once** at startup
// ---------------------------------------------------------------------
messages.connectToMongoDB().catch(err => {
  console.error('Failed to connect to MongoDB. Aborting startup.');
  process.exit(1);  // Crash fast → Kubernetes will restart
});

// ---------------------------------------------------------------------
// 3. View engine setup
// ---------------------------------------------------------------------
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

const router = express.Router();
app.use(router);

app.use(express.static('public'));
router.use(bodyParser.urlencoded({ extended: false }));

// ---------------------------------------------------------------------
// 4. /health endpoint (for Kubernetes liveness/readiness probes)
// ---------------------------------------------------------------------
app.get('/health', (req, res) => {
  const dbStatus = messages.isConnected() ? 'connected' : 'disconnected';
  if (!messages.isConnected()) {
    return res.status(503).json({ status: 'error', mongo: dbStatus });
  }
  res.json({ status: 'ok', mongo: dbStatus });
});

// ---------------------------------------------------------------------
// 5. Start server (port from env, default 8080)
// ---------------------------------------------------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

// ---------------------------------------------------------------------
// 6. Routes
// ---------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const savedMessages = await messages.getMessages();
    console.log('Read all messages');
    const util = require('./utils');
    const result = util.formatMessages(savedMessages);
    res.render('home', { messages: result });
  } catch (err) {
    console.error('Error loading messages:', err);
    res.status(500).send('Failed to load messages');
  }
});

router.post('/post', async (req, res) => {
  console.log(`received request: ${req.method} ${req.url}`);

  const name = req.body.name?.trim();
  const message = req.body.message?.trim();

  if (!name) return res.status(400).send('name is not specified');
  if (!message) return res.status(400).send('message is not specified');

  console.log(`posting to db: name: ${name} body: ${message}`);
  try {
    await messages.setMessage(name, message);
    res.redirect('/');
  } catch (err) {
    console.error('Error saving message:', err);
    res.status(500).send('Failed to save message');
  }});