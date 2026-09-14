const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let dbType = 'mysql'; // 'mysql' or 'sqlite'
let pool = null;
let sqliteDb = null;

// Initial sample seed data for fallback / auto-seeding
const SAMPLE_BOOKS = [
  { id: 1, title: 'Atomic Habits', author: 'James Clear', language: 'English', condition: 'Good', owner_name: 'Rahul', owner_contact: 'rahul.swap@email.com', status: 'Available' },
  { id: 2, title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', language: 'English', condition: 'Like New', owner_name: 'Amit', owner_contact: 'amit.reader@email.com', status: 'Available' },
  { id: 3, title: 'The Psychology of Money', author: 'Morgan Housel', language: 'English', condition: 'New', owner_name: 'Priya', owner_contact: 'priya99@email.com', status: 'Available' },
  { id: 4, title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', language: 'English', condition: 'Good', owner_name: 'Sneha', owner_contact: 'sneha.k@email.com', status: 'Available' },
  { id: 5, title: 'The Alchemist', author: 'Paulo Coelho', language: 'Spanish', condition: 'Fair', owner_name: 'Carlos', owner_contact: 'carlos.books@email.com', status: 'Available' },
  { id: 6, title: 'Ikigai: The Japanese Secret to a Long and Happy Life', author: 'Héctor García & Francesc Miralles', language: 'English', condition: 'Like New', owner_name: 'Ananya', owner_contact: 'ananya.lib@email.com', status: 'Available' }
];

const SAMPLE_REQUESTS = [
  { id: 1, book_id: 1, requester_name: 'Amit', requester_contact: 'amit.reader@email.com', message: 'I have "Rich Dad Poor Dad" for exchange. Would love to swap!', status: 'Pending' },
  { id: 2, book_id: 1, requester_name: 'Sneha', requester_contact: 'sneha.k@email.com', message: 'I have Wings of Fire in great condition. Are you interested?', status: 'Pending' },
  { id: 3, book_id: 3, requester_name: 'Rahul', requester_contact: 'rahul.swap@email.com', message: 'Hey Priya, would you like to swap for Atomic Habits?', status: 'Pending' }
];

/**
 * Initialize SQLite Database (Fallback & zero-config ready)
 */
async function initSQLite() {
  dbType = 'sqlite';
  console.log('ℹ️ Initializing SQLite Database storage (data/book_swap.sqlite)...');
  
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'book_swap.sqlite');
  
  return new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(dbPath, async (err) => {
      if (err) return reject(err);

      // Create books table
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          author TEXT NOT NULL,
          language TEXT NOT NULL DEFAULT 'English',
          condition TEXT NOT NULL DEFAULT 'Good',
          owner_name TEXT NOT NULL,
          owner_contact TEXT,
          status TEXT NOT NULL DEFAULT 'Available',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, async (err) => {
        if (err) return reject(err);

        // Create swap_requests table
        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS swap_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            requester_name TEXT NOT NULL,
            requester_contact TEXT,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
          )
        `, async (err) => {
          if (err) return reject(err);

          // Seed if empty
          sqliteDb.get('SELECT COUNT(*) as count FROM books', [], (err, row) => {
            if (!err && row && row.count === 0) {
              const stmtBook = sqliteDb.prepare('INSERT INTO books (id, title, author, language, condition, owner_name, owner_contact, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
              SAMPLE_BOOKS.forEach(b => stmtBook.run(b.id, b.title, b.author, b.language, b.condition, b.owner_name, b.owner_contact, b.status));
              stmtBook.finalize();

              const stmtReq = sqliteDb.prepare('INSERT INTO swap_requests (id, book_id, requester_name, requester_contact, message, status) VALUES (?, ?, ?, ?, ?, ?)');
              SAMPLE_REQUESTS.forEach(r => stmtReq.run(r.id, r.book_id, r.requester_name, r.requester_contact, r.message, r.status));
              stmtReq.finalize();
              console.log('✅ SQLite seeded with initial sample books and swap requests.');
            }
            resolve(true);
          });
        });
      });
    });
  });
}

/**
 * Initialize MySQL Database & Pool
 */
async function initMySQL() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306');
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'book_swap_db';

  // Try creating database first using admin connection
  const rootConn = await mysql.createConnection({ host, port, user, password });
  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await rootConn.end();

  // Create connection pool to the database
  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Ensure tables exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`books\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`author\` VARCHAR(255) NOT NULL,
      \`language\` VARCHAR(100) NOT NULL DEFAULT 'English',
      \`condition\` ENUM('New', 'Like New', 'Good', 'Fair', 'Poor') NOT NULL DEFAULT 'Good',
      \`owner_name\` VARCHAR(150) NOT NULL,
      \`owner_contact\` VARCHAR(255) DEFAULT NULL,
      \`status\` ENUM('Available', 'Swapped') NOT NULL DEFAULT 'Available',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`swap_requests\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`book_id\` INT NOT NULL,
      \`requester_name\` VARCHAR(150) NOT NULL,
      \`requester_contact\` VARCHAR(255) DEFAULT NULL,
      \`message\` TEXT NOT NULL,
      \`status\` ENUM('Pending', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Pending',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT \`fk_swap_requests_book\`
        FOREIGN KEY (\`book_id\`) REFERENCES \`books\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Seed sample data if books table is empty
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM books');
  if (rows[0].count === 0) {
    for (const b of SAMPLE_BOOKS) {
      await pool.query(
        'INSERT INTO books (id, title, author, language, `condition`, owner_name, owner_contact, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [b.id, b.title, b.author, b.language, b.condition, b.owner_name, b.owner_contact, b.status]
      );
    }
    for (const r of SAMPLE_REQUESTS) {
      await pool.query(
        'INSERT INTO swap_requests (id, book_id, requester_name, requester_contact, message, status) VALUES (?, ?, ?, ?, ?, ?)',
        [r.id, r.book_id, r.requester_name, r.requester_contact, r.message, r.status]
      );
    }
    console.log('✅ MySQL seeded with initial sample books and swap requests.');
  }

  dbType = 'mysql';
  console.log(`✅ Connected to MySQL database "${database}" on ${host}:${port}`);
}

/**
 * Unified Database Query Runner
 * Works across both MySQL and SQLite
 */
async function query(sql, params = []) {
  if (dbType === 'mysql' && pool) {
    const [results] = await pool.query(sql, params);
    return results;
  } else if (dbType === 'sqlite' && sqliteDb) {
    return new Promise((resolve, reject) => {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('SELECT')) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      } else if (trimmed.startsWith('INSERT')) {
        sqliteDb.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ insertId: this.lastID, affectedRows: this.changes });
        });
      } else {
        sqliteDb.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ affectedRows: this.changes });
        });
      }
    });
  } else {
    throw new Error('Database is not initialized.');
  }
}

/**
 * Initialize connection on startup
 */
async function initializeDatabase() {
  try {
    await initMySQL();
    return 'mysql';
  } catch (mysqlErr) {
    console.warn(`⚠️ MySQL connection failed (${mysqlErr.message}).`);
    if (process.env.ENABLE_SQLITE_FALLBACK !== 'false') {
      console.log('🔄 Switching to SQLite fallback engine...');
      await initSQLite();
      return 'sqlite';
    } else {
      throw mysqlErr;
    }
  }
}

function getDatabaseType() {
  return dbType;
}

module.exports = {
  initializeDatabase,
  query,
  getDatabaseType
};
