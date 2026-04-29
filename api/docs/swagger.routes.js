/**
 * Swagger sandbox routes.
 */

const express = require('express');
const path = require('path');
const openApiSpec = require('./openapi');

const router = express.Router();

router.get(['/', '/swagger', '/swagger-ui'], (req, res) => {
    res.sendFile(path.join(__dirname, 'swagger-ui.html'));
});

router.get('/openapi.json', (req, res) => {
    res.json(openApiSpec);
});

module.exports = router;
