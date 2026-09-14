-- ===================================================
-- Book Swap Platform - MySQL Database Schema
-- ===================================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `book_swap_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `book_swap_db`;

-- ---------------------------------------------------
-- Table 1: books
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `books` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(255) NOT NULL,
  `language` VARCHAR(100) NOT NULL DEFAULT 'English',
  `condition` ENUM('New', 'Like New', 'Good', 'Fair', 'Poor') NOT NULL DEFAULT 'Good',
  `owner_name` VARCHAR(150) NOT NULL,
  `owner_contact` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('Available', 'Swapped') NOT NULL DEFAULT 'Available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------
-- Table 2: swap_requests
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `swap_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `book_id` INT NOT NULL,
  `requester_name` VARCHAR(150) NOT NULL,
  `requester_contact` VARCHAR(255) DEFAULT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('Pending', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_swap_requests_book`
    FOREIGN KEY (`book_id`) REFERENCES `books` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for fast searching and filtering
CREATE INDEX `idx_books_status` ON `books` (`status`);
CREATE INDEX `idx_books_title` ON `books` (`title`);
CREATE INDEX `idx_books_author` ON `books` (`author`);
CREATE INDEX `idx_books_owner` ON `books` (`owner_name`);
CREATE INDEX `idx_swap_requests_book_id` ON `swap_requests` (`book_id`);
CREATE INDEX `idx_swap_requests_status` ON `swap_requests` (`status`);
CREATE INDEX `idx_swap_requests_requester` ON `swap_requests` (`requester_name`);
