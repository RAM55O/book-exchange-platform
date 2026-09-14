const db = require('../config/db');

/**
 * GET /api/requests
 * Filters: ?owner_name=Rahul or ?requester_name=Amit or ?book_id=1 or ?status=Pending
 */
exports.getAllRequests = async (req, res) => {
  try {
    const { owner_name, requester_name, book_id, status } = req.query;

    let sql = `
      SELECT 
        r.id,
        r.book_id,
        r.requester_name,
        r.requester_contact,
        r.message,
        r.status,
        r.created_at,
        b.title AS book_title,
        b.author AS book_author,
        b.owner_name AS book_owner,
        b.owner_contact AS book_owner_contact,
        b.status AS book_status
      FROM swap_requests r
      JOIN books b ON r.book_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (owner_name && owner_name.trim() !== '') {
      sql += ` AND b.owner_name LIKE ?`;
      params.push(`%${owner_name.trim()}%`);
    }

    if (requester_name && requester_name.trim() !== '') {
      sql += ` AND r.requester_name LIKE ?`;
      params.push(`%${requester_name.trim()}%`);
    }

    if (book_id) {
      sql += ` AND r.book_id = ?`;
      params.push(book_id);
    }

    if (status && status !== 'All') {
      sql += ` AND r.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY r.created_at DESC`;

    const requests = await db.query(sql, params);
    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    console.error('Error fetching swap requests:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve swap requests', error: err.message });
  }
};

/**
 * POST /api/requests
 * Body: { book_id, requester_name, requester_contact, message }
 */
exports.createRequest = async (req, res) => {
  try {
    const { book_id, requester_name, requester_contact, message } = req.body;

    if (!book_id || !requester_name || !message) {
      return res.status(400).json({
        success: false,
        message: 'Book selection, requester name, and a swap message/offer are required.'
      });
    }

    // Check if book exists
    const books = await db.query('SELECT * FROM books WHERE id = ?', [book_id]);
    if (!books || books.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const book = books[0];
    if (book.status === 'Swapped') {
      return res.status(400).json({
        success: false,
        message: 'This book has already been swapped and is no longer available.'
      });
    }

    // Prevent owner from requesting their own book
    if (book.owner_name.trim().toLowerCase() === requester_name.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot request a swap for your own book!'
      });
    }

    const contact = requester_contact && requester_contact.trim() !== '' ? requester_contact.trim() : null;

    const result = await db.query(
      'INSERT INTO swap_requests (book_id, requester_name, requester_contact, message, status) VALUES (?, ?, ?, ?, ?)',
      [book_id, requester_name.trim(), contact, message.trim(), 'Pending']
    );

    const newRequestId = result.insertId;
    const created = await db.query(
      `SELECT r.*, b.title as book_title, b.owner_name as book_owner 
       FROM swap_requests r 
       JOIN books b ON r.book_id = b.id 
       WHERE r.id = ?`,
      [newRequestId]
    );

    res.status(201).json({
      success: true,
      message: 'Swap request submitted successfully! The book owner can now review it.',
      data: created[0]
    });
  } catch (err) {
    console.error('Error creating swap request:', err);
    res.status(500).json({ success: false, message: 'Failed to submit swap request', error: err.message });
  }
};

/**
 * PATCH /api/requests/:id/status
 * Body: { status: 'Accepted' | 'Rejected' | 'Pending' }
 */
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Accepted', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "Accepted", "Rejected", or "Pending".'
      });
    }

    // Fetch existing request
    const requests = await db.query('SELECT * FROM swap_requests WHERE id = ?', [id]);
    if (!requests || requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Swap request not found' });
    }

    const request = requests[0];
    await db.query('UPDATE swap_requests SET status = ? WHERE id = ?', [status, id]);

    // If accepted, mark the book as Swapped and optionally reject other pending requests
    if (status === 'Accepted') {
      await db.query('UPDATE books SET status = ? WHERE id = ?', ['Swapped', request.book_id]);
      // Auto-reject other pending requests for the same book
      await db.query('UPDATE swap_requests SET status = ? WHERE book_id = ? AND id != ? AND status = ?', ['Rejected', request.book_id, id, 'Pending']);
    } else if (status === 'Rejected' || status === 'Pending') {
      // Check if any other request is accepted, if not keep or revert book to Available
      const otherAccepted = await db.query('SELECT id FROM swap_requests WHERE book_id = ? AND status = ?', [request.book_id, 'Accepted']);
      if (otherAccepted.length === 0) {
        await db.query('UPDATE books SET status = ? WHERE id = ?', ['Available', request.book_id]);
      }
    }

    res.json({
      success: true,
      message: `Swap request successfully updated to ${status}.`
    });
  } catch (err) {
    console.error('Error updating swap request status:', err);
    res.status(500).json({ success: false, message: 'Failed to update swap request status', error: err.message });
  }
};

/**
 * DELETE /api/requests/:id
 */
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM swap_requests WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Swap request not found' });
    }

    res.json({ success: true, message: 'Swap request cancelled / deleted successfully.' });
  } catch (err) {
    console.error('Error deleting swap request:', err);
    res.status(500).json({ success: false, message: 'Failed to delete swap request', error: err.message });
  }
};

/**
 * GET /api/stats
 */
exports.getStats = async (req, res) => {
  try {
    const [totalBooks] = await db.query('SELECT COUNT(*) as count FROM books');
    const [availableBooks] = await db.query('SELECT COUNT(*) as count FROM books WHERE status = "Available"');
    const [swappedBooks] = await db.query('SELECT COUNT(*) as count FROM books WHERE status = "Swapped"');
    const [totalRequests] = await db.query('SELECT COUNT(*) as count FROM swap_requests');
    const [pendingRequests] = await db.query('SELECT COUNT(*) as count FROM swap_requests WHERE status = "Pending"');

    res.json({
      success: true,
      data: {
        totalBooks: totalBooks.count,
        availableBooks: availableBooks.count,
        swappedBooks: swappedBooks.count,
        totalRequests: totalRequests.count,
        pendingRequests: pendingRequests.count
      }
    });
  } catch (err) {
    console.error('Error fetching platform statistics:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch platform stats', error: err.message });
  }
};
