-- ===================================================
-- Book Swap Platform - Initial Sample Data
-- ===================================================

USE `book_swap_db`;

-- Insert Initial Sample Books
INSERT INTO `books` (`id`, `title`, `author`, `language`, `condition`, `owner_name`, `owner_contact`, `status`, `created_at`) VALUES
(1, 'Atomic Habits', 'James Clear', 'English', 'Good', 'Rahul', 'rahul.swap@email.com', 'Available', NOW()),
(2, 'Rich Dad Poor Dad', 'Robert T. Kiyosaki', 'English', 'Like New', 'Amit', 'amit.reader@email.com', 'Available', NOW()),
(3, 'The Psychology of Money', 'Morgan Housel', 'English', 'New', 'Priya', 'priya99@email.com', 'Available', NOW()),
(4, 'Wings of Fire', 'A.P.J. Abdul Kalam', 'English', 'Good', 'Sneha', 'sneha.k@email.com', 'Available', NOW()),
(5, 'The Alchemist', 'Paulo Coelho', 'Spanish', 'Fair', 'Carlos', 'carlos.books@email.com', 'Available', NOW()),
(6, 'Ikigai: The Japanese Secret to a Long and Happy Life', 'Héctor García & Francesc Miralles', 'English', 'Like New', 'Ananya', 'ananya.lib@email.com', 'Available', NOW());

-- Insert Initial Sample Swap Requests
INSERT INTO `swap_requests` (`id`, `book_id`, `requester_name`, `requester_contact`, `message`, `status`, `created_at`) VALUES
(1, 1, 'Amit', 'amit.reader@email.com', 'I have "Rich Dad Poor Dad" for exchange. Would love to swap!', 'Pending', NOW()),
(2, 1, 'Sneha', 'sneha.k@email.com', 'I have Wings of Fire in great condition. Are you interested?', 'Pending', NOW()),
(3, 3, 'Rahul', 'rahul.swap@email.com', 'Hey Priya, would you like to swap for Atomic Habits?', 'Pending', NOW());
