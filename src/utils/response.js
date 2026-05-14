const successResponse = (res, message, data = null, httpCode = 200) => {
  return res.status(httpCode).json({
    status: 0,
    message,
    data
  });
};

const errorResponse = (res, status, message, httpCode = 400) => {
  return res.status(httpCode).json({
    status,
    message,
    data: null
  });
};

module.exports = {
  successResponse,
  errorResponse
};