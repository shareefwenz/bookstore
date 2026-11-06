require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bookstore",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function validateBook(body, requireId = true) {
  const { book_id, title, author, category, price, stock } = body;
  const errors = [];
  if (requireId && (!Number.isInteger(Number(book_id)) || Number(book_id) <= 0)) {
    errors.push("book_id must be a positive integer.");
  }
  if (typeof title !== "string" || !title.trim()) errors.push("title is required.");
  if (typeof author !== "string" || !author.trim()) errors.push("author is required.");
  if (typeof category !== "string" || !category.trim()) errors.push("category is required.");
  if (price === "" || price === undefined || !Number.isFinite(Number(price)) || Number(price) < 0) {
    errors.push("price must be a non-negative number.");
  }
  if (stock === "" || stock === undefined || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
    errors.push("stock must be a non-negative integer.");
  }
  return errors;
}

function bookValues(body) {
  return [
    body.title.trim(),
    body.author.trim(),
    body.category.trim(),
    Number(body.price),
    Number(body.stock)
  ];
}

// READ: get every book
app.get("/books", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT book_id, title, author, category, price, stock FROM books ORDER BY book_id"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /books:", err.message);
    res.status(500).json({ error: "Could not retrieve books. Check the database connection." });
  }
});

// READ: get one book by ID (returns an array to support the existing frontend)
app.get("/books/:book_id", async (req, res) => {
  const id = Number(req.params.book_id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid book ID." });
  try {
    const [rows] = await pool.execute(
      "SELECT book_id, title, author, category, price, stock FROM books WHERE book_id = ?",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Book not found." });
    res.json(rows);
  } catch (err) {
    console.error("GET /books/:book_id:", err.message);
    res.status(500).json({ error: "Could not retrieve this book." });
  }
});

// CREATE: add a book
app.post("/books", async (req, res) => {
  const errors = validateBook(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });
  try {
    const values = [Number(req.body.book_id), ...bookValues(req.body)];
    await pool.execute(
      "INSERT INTO books (book_id, title, author, category, price, stock) VALUES (?, ?, ?, ?, ?, ?)",
      values
    );
    res.status(201).send("Book added successfully.");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).send("A book with this ID already exists.");
    console.error("POST /books:", err.message);
    res.status(500).send("Could not add book. Check the database connection.");
  }
});

// UPDATE: replace all editable book details by ID
app.put("/books/:book_id", async (req, res) => {
  const id = Number(req.params.book_id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).send("Invalid book ID.");
  const errors = validateBook({ ...req.body, book_id: id });
  if (errors.length) return res.status(400).send(errors.join(" "));
  try {
    const [result] = await pool.execute(
      "UPDATE books SET title = ?, author = ?, category = ?, price = ?, stock = ? WHERE book_id = ?",
      [...bookValues(req.body), id]
    );
    if (result.affectedRows === 0) return res.status(404).send("Book not found.");
    res.send("Book updated successfully.");
  } catch (err) {
    console.error("PUT /books/:book_id:", err.message);
    res.status(500).send("Could not update book. Check the database connection.");
  }
});

// DELETE: remove a book by ID
app.delete("/books/:book_id", async (req, res) => {
  const id = Number(req.params.book_id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).send("Invalid book ID.");
  try {
    const [result] = await pool.execute("DELETE FROM books WHERE book_id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).send("Book not found.");
    res.send("Book deleted successfully.");
  } catch (err) {
    console.error("DELETE /books/:book_id:", err.message);
    res.status(500).send("Could not delete book. Check the database connection.");
  }
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("Connected to MySQL database.");
    app.listen(PORT, () => console.log(`Bookstore app running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("Could not connect to MySQL:", err.message);
    console.error("Check MySQL is running and your .env database settings are correct.");
    process.exit(1);
  }
}
start();
