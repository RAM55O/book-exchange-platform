const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

// GET all swap requests (supports filter by ?owner_name= or ?requester_name= or ?book_id=)
router.get('/', requestController.getAllRequests);

// POST create a swap request
router.post('/', requestController.createRequest);

// PATCH update status of a swap request (Accept / Reject)
router.patch('/:id/status', requestController.updateRequestStatus);

// DELETE / cancel swap request
router.delete('/:id', requestController.deleteRequest);

module.exports = router;
