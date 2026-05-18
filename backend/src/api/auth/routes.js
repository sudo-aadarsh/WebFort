import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as otplib from 'otplib';
const { authenticator } = otplib;
import QRCode from 'qrcode';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Configure Google SSO Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'mock-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-client-secret',
    callbackURL: `${process.env.API_URL || 'http://localhost:3001'}/api/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      let user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      
      if (!user) {
        // Create new user for SSO
        const id = uuidv4();
        const apiKey = `wf_${uuidv4().replace(/-/g, '')}`;
        // Random secure password since SSO manages auth
        const randomPass = await bcrypt.hash(uuidv4(), 10);
        
        await db.prepare(
          'INSERT INTO users (id, email, password, name, api_key) VALUES (?, ?, ?, ?, ?)'
        ).run(id, email, randomPass, profile.displayName, apiKey);
        
        user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Google SSO Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), (req, res) => {
  const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
  
  // Redirect back to frontend
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/oauth-callback?token=${token}`);
});

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, company } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);
    const apiKey = `wf_${uuidv4().replace(/-/g, '')}`;

    await db.prepare(
      'INSERT INTO users (id, email, password, name, company, api_key) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, email, hashedPassword, name, company || null, apiKey);

    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.status(201).json({
      user: { id, tenant_id: null, email, name, company, role: 'user' },
      token,
      apiKey
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.mfa_enabled) {
      const { mfaToken } = req.body;
      if (!mfaToken) {
        return res.status(403).json({ error: 'MFA token required', mfaRequired: true });
      }
      
      const isValid = authenticator.verify({ token: mfaToken, secret: user.mfa_secret });
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid MFA token' });
      }
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.json({
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  const user = await db.prepare('SELECT id, tenant_id, email, name, role, company, api_key, mfa_enabled, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// Refresh token
router.post('/refresh', authenticate, async (req, res) => {
  const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
  res.json({ token });
});

// Setup MFA
router.post('/mfa/setup', authenticate, async (req, res, next) => {
  try {
    const user = await db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id);
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'WebSecure', secret);
    
    await db.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').run(secret, req.user.id);
    
    const qrCode = await QRCode.toDataURL(otpauthUrl);
    res.json({ secret, qrCode });
  } catch (error) {
    next(error);
  }
});

// Verify MFA
router.post('/mfa/verify', authenticate, async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await db.prepare('SELECT mfa_secret FROM users WHERE id = ?').get(req.user.id);
    
    if (!user || !user.mfa_secret) {
      return res.status(400).json({ error: 'MFA setup not initiated' });
    }
    
    const isValid = authenticator.verify({ token, secret: user.mfa_secret });
    
    if (isValid) {
      await db.prepare('UPDATE users SET mfa_enabled = true WHERE id = ?').run(req.user.id);
      res.json({ message: 'MFA enabled successfully' });
    } else {
      res.status(401).json({ error: 'Invalid MFA token' });
    }
  } catch (error) {
    next(error);
  }
});

// Change password
router.patch('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const user = await db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await db.prepare('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?').run(hashedNewPassword, req.user.id);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
