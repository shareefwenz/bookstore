CREATE DATABASE IF NOT EXISTS bookstore;
USE bookstore;

CREATE TABLE IF NOT EXISTS books (
    book_id INT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    author VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    CHECK (price >= 0),
    CHECK (stock >= 0)
);

-- Optional sample data for testing:
INSERT INTO books (book_id, title, author, category, price, stock)
VALUES
(101, 'The Alchemist', 'Paulo Coelho', 'Fiction', 299.00, 12),
(102, 'Wings of Fire', 'A. P. J. Abdul Kalam', 'Biography', 250.00, 8)
ON DUPLICATE KEY UPDATE title = VALUES(title);
