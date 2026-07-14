import { ZodError } from 'zod';
import { sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

/**
 * Factory that returns an Express middleware which validates
 * req.body against the provided Zod schema.
 *
 * On failure it returns a 422 with a structured errors array
 * so the frontend can map errors to individual form fields.
 *
 * @param {import('zod').ZodSchema} schema
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field:   e.path.join('.'),
          message: e.message,
        }));
        return sendError(res, {
          message:    'Validation failed',
          statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          errors,
        });
      }
      next(err);
    }
  };
}
