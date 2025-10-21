const { z } = require('zod');

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  vatNumber: z.string().optional(),
  tinNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().optional(),
  backupCode: z.string().optional(),
});

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().optional(),
  role: z.enum(['Admin', 'Manager', 'Employee']).optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  salary: z.number().min(0).optional(),
  pinCode: z.string().length(4).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  fullName: z.string().optional(),
  role: z.enum(['Admin', 'Manager', 'Employee']).optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  salary: z.number().min(0).optional(),
  pinCode: z.string().length(4).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  vatNumber: z.string().optional(),
  tinNumber: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  currentPassword: z.string().optional(),
  mfaEnabled: z.boolean().optional(),
  mfaSecret: z.string().optional(),
  backupCodes: z.array(z.string()).optional(),
});

const pinLoginSchema = z.object({
  pinCode: z.string().length(4, 'PIN must be exactly 4 digits'),
});

const verifyMfaSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  totpCode: z.string().optional(),
  backupCode: z.string().optional(),
});

const completeMfaLoginSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

module.exports = {
  signupSchema,
  loginSchema,
  createUserSchema,
  updateUserSchema,
  verifyMfaSchema,
  completeMfaLoginSchema,
  pinLoginSchema,
  validateRequest,
};
