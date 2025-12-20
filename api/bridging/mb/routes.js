/**
 * MB (Mikrobiologi) Routes
 * All routes for MB lab type
 * 
 * TODO: Implement MB endpoints
 */

const express = require('express');
const router = express.Router();

/**
 * Placeholder endpoints
 * Will be implemented in the future
 */

router.get('/:limit/:noorder', (req, res) => {
    res.status(501).json({
        success: false,
        message: "MB endpoints not yet implemented",
        payload: []
    });
});

module.exports = router;

