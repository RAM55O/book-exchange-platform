const db = require('../config/db');

/**
 * GET /api/books
 * Supports search and filters: ?search=atomic&condition=Good&language=English&status=Available
 */
exports.getAllBooks = async (req, res) => {
  try {
    const { search, condition, language, status } = req.query;

    let sql = `
      SELECT 
        b.id,
        b.title,
        b.author,
        b.language,
        b.condition,
        b.owner_name,
        b.owner_contact,
        b.status,
        b.created_at,
        COUNT(r.id) AS request_count
      FROM books b
      LEFT JOIN swap_requests r ON b.id = r.book_id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      sql += ` AND (b.title LIKE ? OR b.author LIKE ? OR b.language LIKE ? OR b.owner_name LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (condition && condition !== 'All') {
      sql += ` AND b.condition = ?`;
      params.push(condition);
    }

    if (language && language !== 'All') {
      sql += ` AND b.language = ?`;
      params.push(language);
    }

    if (status && status !== 'All') {
      sql += ` AND b.status = ?`;
      params.push(status);
    }

    sql += ` GROUP BY b.id ORDER BY b.created_at DESC`;

    const books = await db.query(sql, params);
    res.json({ success: true, count: books.length, data: books });
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve books', error: err.message });
  }
};

/**
 * GET /api/books/:id
 */
exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const books = await db.query('SELECT * FROM books WHERE id = ?', [id]);

    if (!books || books.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const requests = await db.query(
      'SELECT id, requester_name, requester_contact, message, status, created_at FROM swap_requests WHERE book_id = ? ORDER BY created_at DESC',
      [id]
    );

    const book = books[0];
    book.swap_requests = requests;

    res.json({ success: true, data: book });
  } catch (err) {
    console.error('Error fetching book:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve book details', error: err.message });
  }
};

/**
 * POST /api/books
 * Body: { title, author, language, condition, owner_name, owner_contact }
 */
exports.createBook = async (req, res) => {
  try {
    const { title, author, language, condition, owner_name, owner_contact } = req.body;

    if (!title || !author || !owner_name) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, and owner name are required fields.'
      });
    }

    const bookLanguage = language && language.trim() !== '' ? language.trim() : 'English';
    const bookCondition = condition && ['New', 'Like New', 'Good', 'Fair', 'Poor'].includes(condition) ? condition : 'Good';
    const bookContact = owner_contact && owner_contact.trim() !== '' ? owner_contact.trim() : null;

    const result = await db.query(
      'INSERT INTO books (title, author, language, `condition`, owner_name, owner_contact, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title.trim(), author.trim(), bookLanguage, bookCondition, owner_name.trim(), bookContact, 'Available']
    );

    const newBookId = result.insertId;
    const created = await db.query('SELECT * FROM books WHERE id = ?', [newBookId]);

    res.status(201).json({
      success: true,
      message: 'Book posted successfully for swapping!',
      data: created[0]
    });
  } catch (err) {
    console.error('Error creating book:', err);
    res.status(500).json({ success: false, message: 'Failed to post book', error: err.message });
  }
};

/**
 * PUT /api/books/:id/status
 * Body: { status: 'Available' | 'Swapped' }
 */
exports.updateBookStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Available', 'Swapped'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be either "Available" or "Swapped".' });
    }

    const result = await db.query('UPDATE books SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, message: `Book status updated to ${status}` });
  } catch (err) {
    console.error('Error updating book status:', err);
    res.status(500).json({ success: false, message: 'Failed to update book status', error: err.message });
  }
};

/**
 * DELETE /api/books/:id
 */
exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM books WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, message: 'Book listing and associated swap requests deleted successfully.' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ success: false, message: 'Failed to delete book', error: err.message });
  }
};
