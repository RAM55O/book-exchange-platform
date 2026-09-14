const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// GET all books (with search & filters)
router.get('/', bookController.getAllBooks);

// GET single book by ID
router.get('/:id', bookController.getBookById);

// POST new book
router.post('/', bookController.createBook);

// PUT update book status
router.put('/:id/status', bookController.updateBookStatus);

// DELETE book
router.delete('/:id', bookController.deleteBook);

module.exports = router;
