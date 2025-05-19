const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

// Allgemeiner Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 100, // Limit jede IP auf 100 Requests pro Fenster
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.originalUrl
        });
        res.status(429).json({
            message: 'Too many requests, please try again later.'
        });
    }
});

// Strikterer Rate Limiter für Login-Anfragen
const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 Stunde
    max: 5, // 5 Login-Versuche pro Stunde
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Login rate limit exceeded', {
            ip: req.ip,
            username: req.body.username
        });
        res.status(429).json({
            message: 'Too many login attempts, please try again later.'
        });
    }
});

module.exports = {
    apiLimiter,
    loginLimiter
};