const router = require('express').Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../utils/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

// Öffentliche Routen (ohne Authentifizierung)
router.post('/login', loginLimiter, authController.login);
router.post('/setup-admin', authController.setupAdmin);

// Geschützte Routen (mit Authentifizierung)
router.post('/change-password', authMiddleware, authController.changePassword);
router.post('/logout', authMiddleware, authController.logout);
router.get('/validate', authMiddleware, authController.validateToken);

module.exports = router;