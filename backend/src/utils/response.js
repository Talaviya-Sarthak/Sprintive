import { HTTP_STATUS } from './constants.js';

/**
 * Sends a standardized success response.
 *
 * @param {import('express').Response} res
 * @param {object} opts
 * @param {string}  opts.message
 * @param {any}     [opts.data]
 * @param {number}  [opts.statusCode]
 */
export function sendSuccess(res, { message, data = null, statusCode = HTTP_STATUS.OK }) {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
}

/**
 * Sends a standardized error response.
 *
 * @param {import('express').Response} res
 * @param {object} opts
 * @param {string}   opts.message
 * @param {number}   [opts.statusCode]
 * @param {any[]}    [opts.errors]
 */
export function sendError(res, { message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = [] }) {
  return res.status(statusCode).json({ success: false, message, errors });
}
