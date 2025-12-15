// helpers/response.js
export function sendError(res, status, field, message) {
  return res.status(status).json({
    success: false,
    field,
    message,
  });
}
