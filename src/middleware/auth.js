const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return errorResponse(res, 108, 'Token tidak tidak valid atau kadaluwarsa', 401);
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return errorResponse(res, 108, 'Token tidak tidak valid atau kadaluwarsa', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, 108, 'Token tidak tidak valid atau kadaluwarsa', 401);
  }
};

module.exports = authMiddleware;