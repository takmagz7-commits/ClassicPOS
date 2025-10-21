const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getAll, getById, insert, update, query, queryOne } = require('../db/dbService.cjs');
const { userToDb, dbToUser, boolToInt, intToBool } = require('../db/helpers.cjs');
const { hashPassword, comparePassword } = require('../utils/passwordUtils.cjs');
const { generateToken } = require('../utils/jwtUtils.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const registrationLockMiddleware = require('../middleware/registrationLock.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');
const { TOTP, Secret } = require('otpauth');
const { logger } = require('../utils/logger.cjs');
const { 
  signupSchema, 
  loginSchema, 
  createUserSchema, 
  updateUserSchema,
  verifyMfaSchema,
  completeMfaLoginSchema,
  pinLoginSchema,
  validateRequest 
} = require('../utils/validation.cjs');
const { 
  initializeSystem, 
  markPinSetupComplete, 
  getSystemState,
  resetSystem 
} = require('../utils/systemSettings.cjs');

// Rate limiting configuration for MFA verification (configurable via env)
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.MFA_RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 minute
const MAX_MFA_ATTEMPTS = parseInt(process.env.MFA_MAX_ATTEMPTS) || 5;
const mfaAttemptTracker = new Map();

/**
 * Helper: Record MFA attempt for rate limiting
 */
function recordMfaAttempt(userId) {
  const now = Date.now();
  const entry = mfaAttemptTracker.get(userId) || { attempts: 0, firstAt: now };
  
  // Reset if window expired
  if (now - entry.firstAt > RATE_LIMIT_WINDOW_MS) {
    entry.attempts = 1;
    entry.firstAt = now;
  } else {
    entry.attempts += 1;
  }
  
  mfaAttemptTracker.set(userId, entry);
  return entry;
}

/**
 * Helper: Reset MFA attempts on successful verification
 */
function resetMfaAttempts(userId) {
  mfaAttemptTracker.delete(userId);
}

/**
 * Helper: Check if user is rate limited
 */
function isRateLimited(userId) {
  const entry = mfaAttemptTracker.get(userId);
  if (!entry) return false;
  
  const now = Date.now();
  return entry.attempts >= MAX_MFA_ATTEMPTS && (now - entry.firstAt) < RATE_LIMIT_WINDOW_MS;
}

router.post('/signup', registrationLockMiddleware, activityLogger('auth', 'Signup'), validateRequest(signupSchema), async (req, res) => {
  try {
    const { 
      email, 
      password, 
      businessName, 
      businessType, 
      country, 
      phone, 
      vatNumber, 
      tinNumber 
    } = req.body;

    const existingUser = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User exists',
        message: 'An account with this email already exists' 
      });
    }

    const hashedPassword = await hashPassword(password);

    const allUsers = getAll('users');
    const isFirstUser = allUsers.length === 0;
    
    const newUser = {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      role: 'admin',
      mfaEnabled: false,
      businessName: businessName || null,
      businessType: businessType || null,
      country: country || null,
      phone: phone || null,
      vatNumber: vatNumber || null,
      tinNumber: tinNumber || null
    };

    const dbUser = userToDb(newUser);
    insert('users', dbUser);

    initializeSystem(email);
    logger.info(`First admin account created: ${email}`);

    const { password: _, ...userWithoutPassword } = newUser;

    const token = generateToken(newUser);

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'Admin account created successfully',
      user: userWithoutPassword,
      token,
      systemInitialized: true,
      pinSetupRequired: true
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

router.post('/login', activityLogger('auth', 'Login'), validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const dbUser = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!dbUser) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Invalid email or password' 
      });
    }

    const isPasswordValid = await comparePassword(password, dbUser.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Invalid email or password' 
      });
    }

    const user = dbToUser(dbUser);
    const { password: _, ...userWithoutPassword } = user;

    const mfaRequired = intToBool(dbUser.mfa_enabled);

    if (mfaRequired) {
      return res.json({
        mfaRequired: true,
        userId: user.id,
        email: user.email
      });
    }

    const token = generateToken(user);

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

router.post('/setup-mfa', authMiddleware, activityLogger('auth', 'Setup MFA'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    const dbUser = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!dbUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User not found' 
      });
    }

    const user = dbToUser(dbUser);

    // Check if MFA is already enabled
    if (user.mfaEnabled) {
      return res.status(400).json({
        error: 'MFA already enabled',
        message: 'MFA is already enabled for this account. Disable it first to re-setup.'
      });
    }

    // Generate secret SERVER-SIDE using otpauth
    const randomBytes = crypto.getRandomValues(new Uint8Array(20));
    const secretInstance = new Secret(randomBytes);

    const totp = new TOTP({
      issuer: 'ClassicPOS',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secretInstance.base32
    });

    const secret = totp.secret.base32;
    const otpauthUrl = totp.toString();

    // Store the secret in database (MFA not enabled yet until verified)
    update('users', userId, {
      mfa_secret: secret,
      mfa_enabled: boolToInt(false)
    });

    // Return ONLY the otpauth URL and base32 for QR code generation
    // Secret is returned ONLY during enrollment, never again
    res.json({
      otpauthUrl,
      secret: secret, // Sent only during setup for QR code generation
      message: 'MFA secret generated. Please scan the QR code and verify with a TOTP code to complete setup.'
    });
  } catch (error) {
    logger.error('Setup MFA error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

router.post('/complete-mfa-setup', authMiddleware, activityLogger('auth', 'Complete MFA Setup'), async (req, res) => {
  try {
    const { totpCode } = req.body;
    const userId = req.user.id;

    if (!totpCode) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'TOTP code is required'
      });
    }

    const dbUser = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!dbUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User not found' 
      });
    }

    const user = dbToUser(dbUser);

    if (!user.mfaSecret) {
      return res.status(400).json({
        error: 'MFA not initialized',
        message: 'MFA setup must be initiated first'
      });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({
        error: 'MFA already enabled',
        message: 'MFA is already enabled for this account'
      });
    }

    // Verify the TOTP code to complete setup
    const totp = new TOTP({
      secret: user.mfaSecret,
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    });

    const delta = totp.validate({ token: totpCode, window: 1 });

    if (delta === null) {
      return res.status(401).json({
        error: 'Invalid TOTP code',
        message: 'Invalid or expired TOTP code'
      });
    }

    // Enable MFA now that it's been verified
    update('users', userId, {
      mfa_enabled: boolToInt(true)
    });

    res.json({
      success: true,
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    logger.error('Complete MFA setup error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

router.post('/verify-mfa', activityLogger('auth', 'Verify MFA'), validateRequest(verifyMfaSchema), async (req, res) => {
  try {
    const { userId, totpCode, backupCode } = req.body;

    // Check rate limiting first
    if (isRateLimited(userId)) {
      return res.status(429).json({
        error: 'Too many attempts',
        message: 'Too many MFA verification attempts. Please try again in 1 minute.',
      });
    }

    const dbUser = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!dbUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User not found' 
      });
    }

    const user = dbToUser(dbUser);

    if (totpCode) {
      if (!user.mfaSecret) {
        return res.status(400).json({ 
          error: 'MFA not enabled',
          message: 'MFA is not enabled for this account' 
        });
      }

      try {
        const totp = new TOTP({
          secret: user.mfaSecret,
          algorithm: 'SHA1',
          digits: 6,
          period: 30
        });

        const delta = totp.validate({ token: totpCode, window: 1 });

        if (delta === null) {
          // Record failed attempt
          const attempts = recordMfaAttempt(userId);
          
          return res.status(401).json({ 
            error: 'Invalid TOTP code',
            message: 'Invalid or expired TOTP code',
            attemptsRemaining: Math.max(0, MAX_MFA_ATTEMPTS - attempts.attempts)
          });
        }

        // Success - reset attempts
        resetMfaAttempts(userId);

        const { password: _, backupCodes: __, mfaSecret: ___, ...userWithoutSensitiveData } = user;

        const token = generateToken(user);

        res.cookie('authToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.json({
          message: 'TOTP verified successfully',
          user: userWithoutSensitiveData,
          token,
          success: true
        });
      } catch (totpError) {
        return res.status(500).json({ 
          error: 'TOTP verification failed',
          message: 'Failed to verify TOTP code' 
        });
      }
    }

    if (backupCode && user.backupCodes) {
      const codeIndex = user.backupCodes.indexOf(backupCode);
      
      if (codeIndex === -1) {
        // Record failed attempt
        const attempts = recordMfaAttempt(userId);
        
        return res.status(401).json({ 
          error: 'Invalid backup code',
          message: 'Invalid or already used backup code',
          attemptsRemaining: Math.max(0, MAX_MFA_ATTEMPTS - attempts.attempts)
        });
      }

      // Success - reset attempts
      resetMfaAttempts(userId);

      const updatedBackupCodes = user.backupCodes.filter((_, index) => index !== codeIndex);
      
      const updatedUser = {
        ...user,
        backupCodes: updatedBackupCodes
      };

      update('users', userId, userToDb(updatedUser));

      const { password: _, backupCodes: __, mfaSecret: ___, ...userWithoutSensitiveData } = updatedUser;

      const token = generateToken(updatedUser);

      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
        message: 'Backup code verified successfully',
        user: userWithoutSensitiveData,
        token,
        success: true
      });
    }

    return res.status(400).json({ 
      error: 'Validation error',
      message: 'Either TOTP code or backup code is required' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

router.post('/complete-mfa-login', validateRequest(completeMfaLoginSchema), async (req, res) => {
  try {
    const { userId } = req.body;

    const dbUser = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!dbUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User not found' 
      });
    }

    const user = dbToUser(dbUser);
    const { password: _, backupCodes: __, mfaSecret: ___, ...userWithoutSensitiveData } = user;

    const token = generateToken(user);

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'MFA login completed successfully',
      user: userWithoutSensitiveData,
      token
    });
  } catch (error) {
    logger.error('Complete MFA login error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

router.post('/pin-login', activityLogger('auth', 'PIN Login'), validateRequest(pinLoginSchema), async (req, res) => {
  try {
    const { pinCode } = req.body;

    const dbUsers = query('SELECT * FROM users WHERE pin_code IS NOT NULL AND status = ?', ['active']);
    
    let matchedUser = null;
    for (const dbUser of dbUsers) {
      const isPinValid = await comparePassword(pinCode, dbUser.pin_code);
      if (isPinValid) {
        matchedUser = dbUser;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ 
        error: 'Invalid PIN',
        message: 'Invalid PIN code or user is inactive' 
      });
    }

    const user = dbToUser(matchedUser);
    const { password: _, backupCodes: __, mfaSecret: ___, pinCode: ____, ...userWithoutSensitiveData } = user;

    const token = generateToken(user);

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'PIN login successful',
      user: userWithoutSensitiveData,
      token
    });
  } catch (error) {
    logger.error('PIN login error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

router.post('/logout', activityLogger('auth', 'Logout'), (req, res) => {
  res.clearCookie('authToken');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authMiddleware, (req, res) => {
  try {
    const dbUser = getById('users', req.user.id);
    
    if (!dbUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User not found' 
      });
    }

    const user = dbToUser(dbUser);
    const { password: _, backupCodes: __, mfaSecret: ___, ...userWithoutSensitiveData } = user;

    res.json({ user: userWithoutSensitiveData });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

router.get('/verify-token', authMiddleware, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

router.get('/users', authMiddleware, (req, res) => {
  try {
    const dbUsers = getAll('users');
    const users = dbUsers.map(dbUser => {
      const user = dbToUser(dbUser);
      const { password: _, backupCodes: __, mfaSecret: ___, ...userWithoutSensitiveData } = user;
      return userWithoutSensitiveData;
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id', authMiddleware, (req, res) => {
  try {
    const dbUser = getById('users', req.params.id);
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = dbToUser(dbUser);
    const { password: _, backupCodes: __, mfaSecret: ___, ...userWithoutSensitiveData } = user;
    res.json(userWithoutSensitiveData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', authMiddleware, activityLogger('users'), validateRequest(createUserSchema), async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      role,
      department,
      jobTitle,
      salary,
      pinCode,
      status
    } = req.body;

    const existingUser = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User exists',
        message: 'User with this email already exists' 
      });
    }

    const hashedPassword = await hashPassword(password);
    let hashedPin = null;
    
    if (pinCode) {
      hashedPin = await hashPassword(pinCode);
    }

    const newUser = {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      fullName,
      role: role || 'employee',
      department,
      jobTitle,
      salary: salary || 0,
      pinCode: hashedPin,
      status: status || 'active',
      mfaEnabled: false
    };

    const dbUser = userToDb(newUser);
    insert('users', dbUser);

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', authMiddleware, activityLogger('users'), validateRequest(updateUserSchema), async (req, res) => {
  try {
    const { password, currentPassword, pinCode, ...otherUpdates } = req.body;
    const userId = req.params.id;

    const dbUser = getById('users', userId);
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let finalPassword = dbUser.password;
    let finalPinCode = dbUser.pin_code;

    if (password) {
      if (req.user.id === userId && currentPassword) {
        const isCurrentPasswordValid = await comparePassword(currentPassword, dbUser.password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ 
            error: 'Invalid password',
            message: 'Current password is incorrect' 
          });
        }
      }
      
      finalPassword = await hashPassword(password);
    }

    if (pinCode) {
      finalPinCode = await hashPassword(pinCode);
    }

    const updatedUser = {
      ...dbToUser(dbUser),
      ...otherUpdates,
      password: finalPassword,
      pinCode: finalPinCode
    };

    const updatedDbUser = userToDb(updatedUser);
    update('users', userId, updatedDbUser);

    const { password: _, backupCodes: __, mfaSecret: ___, pinCode: ____, ...userWithoutSensitiveData } = updatedUser;
    res.json(userWithoutSensitiveData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', authMiddleware, activityLogger('users'), (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user.id === userId) {
      return res.status(400).json({ 
        error: 'Cannot delete own account',
        message: 'You cannot delete your own account while logged in' 
      });
    }

    const dbUser = getById('users', userId);
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { remove: removeUser } = require('../db/dbService.cjs');
    removeUser('users', userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/system-status', (req, res) => {
  try {
    const systemState = getSystemState();
    res.json(systemState);
  } catch (error) {
    logger.error('Error getting system status:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

router.post('/setup-pin', authMiddleware, activityLogger('auth', 'PIN Setup'), async (req, res) => {
  try {
    const { pinCode } = req.body;

    if (!pinCode || pinCode.length < 4 || pinCode.length > 6) {
      return res.status(400).json({
        error: 'Invalid PIN',
        message: 'PIN must be 4-6 digits'
      });
    }

    if (!/^\d+$/.test(pinCode)) {
      return res.status(400).json({
        error: 'Invalid PIN',
        message: 'PIN must contain only numbers'
      });
    }

    const hashedPin = await hashPassword(pinCode);
    
    const dbUser = userToDb({
      ...req.user,
      pinCode: hashedPin
    });
    
    update('users', req.user.id, { pin_code: hashedPin });

    markPinSetupComplete();
    logger.info(`PIN setup completed for user: ${req.user.email}`);

    res.json({
      message: 'PIN setup successful',
      pinSetupComplete: true
    });
  } catch (error) {
    logger.error('PIN setup error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

router.post('/reset-system', authMiddleware, activityLogger('auth', 'System Reset'), (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can reset the system'
      });
    }

    const confirmCode = req.body.confirmCode;
    if (confirmCode !== 'RESET') {
      return res.status(400).json({
        error: 'Invalid confirmation',
        message: 'Please provide confirmation code "RESET"'
      });
    }

    resetSystem();
    logger.warn(`System reset by admin: ${req.user.email}`);

    res.json({
      message: 'System reset successful. Registration is now enabled.',
      systemReset: true
    });
  } catch (error) {
    logger.error('System reset error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;
