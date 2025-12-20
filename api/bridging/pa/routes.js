/**
 * PA (Patologi Anatomi) Routes
 * All routes for PA lab type
 * 
 * TODO: Implement PA endpoints
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
        message: "PA endpoints not yet implemented",
        payload: []
    });
});

module.exports = router;

