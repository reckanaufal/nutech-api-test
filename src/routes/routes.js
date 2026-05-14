const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const authMiddleware = require("../middleware/auth");
const { successResponse, errorResponse } = require("../utils/response");

const router = express.Router();

const isValidEmail = (email) => {
  return /\S+@\S+\.\S+/.test(email);
};

const generateInvoiceNumber = () => {
  const now = new Date();

  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.getTime();

  return `INV${date}-${time}`;
};

router.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    return successResponse(res, "Database connected", result.rows[0]);
  } catch (error) {
    return errorResponse(res, 500, error.message, 500);
  }
});

// REGISTRATION
router.post("/registration", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!email || !isValidEmail(email)) {
    return errorResponse(res, 102, "Parameter email tidak sesuai format");
  }

  if (!first_name) {
    return errorResponse(res, 102, "Parameter first_name tidak boleh kosong");
  }

  if (!last_name) {
    return errorResponse(res, 102, "Parameter last_name tidak boleh kosong");
  }

  if (!password || password.length < 8) {
    return errorResponse(res, 102, "Password minimal 8 karakter");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return errorResponse(res, 102, "Email sudah terdaftar");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (email, first_name, last_name, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [email, first_name, last_name, hashedPassword],
    );

    const userId = userResult.rows[0].id;

    await client.query(
      "INSERT INTO balances (user_id, balance) VALUES ($1, $2)",
      [userId, 0],
    );

    await client.query("COMMIT");

    return successResponse(res, "Registrasi berhasil silahkan login");
  } catch (error) {
    await client.query("ROLLBACK");
    return errorResponse(res, 500, error.message, 500);
  } finally {
    client.release();
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !isValidEmail(email)) {
    return errorResponse(res, 102, "Parameter email tidak sesuai format");
  }

  if (!password) {
    return errorResponse(res, 102, "Password tidak boleh kosong");
  }

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return errorResponse(res, 103, "Username atau password salah", 401);
    }

    const user = userResult.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return errorResponse(res, 103, "Username atau password salah", 401);
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "12h",
      },
    );

    return successResponse(res, "Login Sukses", {
      token,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message, 500);
  }
});

// PROFILE
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT email, first_name, last_name, profile_image
       FROM users
       WHERE id = $1`,
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 404, "User tidak ditemukan", 404);
    }

    return successResponse(res, "Sukses", result.rows[0]);
  } catch (error) {
    return errorResponse(res, 500, error.message, 500);
  }
});

router.put("/profile/update", authMiddleware, async (req, res) => {
  const { first_name, last_name } = req.body;
  if (!first_name) {
    return errorResponse(res, 102, "Parameter first_name tidak boleh kosong");
  }
  if (!last_name) {
    return errorResponse(res, 102, "Parameter last_name tidak boleh kosong");
  }
  try {
    await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [first_name, last_name, req.user.id],
    );
    return successResponse(res, "Update Profile Berhasil");
  } catch (error) {
    return errorResponse(res, 500, error.message, 500);
  }
});

// BALANCE
router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT balance FROM balances WHERE user_id = $1",
      [req.user.id],
    );

    const balance = result.rows.length > 0 ? Number(result.rows[0].balance) : 0;

    return successResponse(res, "Get Balance Berhasil", {
      balance,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message, 500);
  }
});

// SERVICES
router.get("/services", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT service_code, service_name, service_icon, service_tariff
       FROM services
       ORDER BY id ASC`,
    );

    return successResponse(res, "Sukses", result.rows);
  } catch (error) {
    return errorResponse(res, 500, error.message, 500);
  }
});

// TOPUP
router.post("/topup", authMiddleware, async (req, res) => {
  const { top_up_amount } = req.body;

  if (!top_up_amount || top_up_amount <= 0) {
    return errorResponse(
      res,
      102,
      "Parameter amount hanya boleh angka dan tidak boleh lebih kecil dari 0",
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE balances
       SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [top_up_amount, req.user.id],
    );

    const invoiceNumber = generateInvoiceNumber();

    await client.query(
      `INSERT INTO transactions 
       (user_id, invoice_number, transaction_type, total_amount, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, invoiceNumber, "TOPUP", top_up_amount, "Top Up balance"],
    );

    const balanceResult = await client.query(
      "SELECT balance FROM balances WHERE user_id = $1",
      [req.user.id],
    );

    await client.query("COMMIT");

    return successResponse(res, "Top Up Balance berhasil", {
      balance: Number(balanceResult.rows[0].balance),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return errorResponse(res, 500, error.message, 500);
  } finally {
    client.release();
  }
});

// TRANSACTION
router.post("/transaction", authMiddleware, async (req, res) => {
  const { service_code } = req.body;

  if (!service_code) {
    return errorResponse(res, 102, "Service code tidak boleh kosong");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const serviceResult = await client.query(
      `SELECT service_code, service_name, service_tariff
       FROM services
       WHERE service_code = $1`,
      [service_code],
    );

    if (serviceResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return errorResponse(res, 102, "Service atau Layanan tidak ditemukan");
    }

    const service = serviceResult.rows[0];

    const balanceResult = await client.query(
      "SELECT balance FROM balances WHERE user_id = $1 FOR UPDATE",
      [req.user.id],
    );

    const currentBalance = Number(balanceResult.rows[0].balance);
    const tariff = Number(service.service_tariff);

    if (currentBalance < tariff) {
      await client.query("ROLLBACK");
      return errorResponse(res, 102, "Saldo tidak mencukupi");
    }

    await client.query(
      `UPDATE balances
       SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [tariff, req.user.id],
    );

    const invoiceNumber = generateInvoiceNumber();

    const transactionResult = await client.query(
      `INSERT INTO transactions 
       (user_id, invoice_number, transaction_type, service_code, service_name, total_amount, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING invoice_number, service_code, service_name, transaction_type, total_amount, created_at`,
      [
        req.user.id,
        invoiceNumber,
        "PAYMENT",
        service.service_code,
        service.service_name,
        tariff,
        service.service_name,
      ],
    );

    await client.query("COMMIT");

    return successResponse(
      res,
      "Transaksi berhasil",
      transactionResult.rows[0],
    );
  } catch (error) {
    await client.query("ROLLBACK");
    return errorResponse(res, 500, error.message, 500);
  } finally {
    client.release();
  }
});

// TRANSACTION HISTORY
router.get("/transaction/history", authMiddleware, async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  try {
    const result = await pool.query(
      `SELECT invoice_number, transaction_type, description, total_amount, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset],
    );

    return successResponse(res, "Get History Berhasil", {
      offset,
      limit,
      records: result.rows,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message, 500);
  }
});

module.exports = router;
