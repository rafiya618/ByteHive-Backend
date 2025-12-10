import { body, validationResult } from 'express-validator';

export const validateCommunity = [
  body('community_name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Community name must be between 3 and 50 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('community_tags')
    .optional()
    .custom((value) => {
      // Handle both array and string formats
      if (Array.isArray(value)) {
        return value.length <= 10;
      }
      // If it's a string, split and check
      if (typeof value === 'string') {
        return value.split(',').length <= 10;
      }
      return true;
    })
    .withMessage('Maximum 10 tags allowed'),
  body('visible')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Visible must be either public or private'),
  body('moderation')
    .optional()
    .isIn(['only admin', 'allow moderators', 'allow all'])
    .withMessage('Invalid moderation type'),
];

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation errors',
      errors: errors.array(),
    });
  }
  next();
};
