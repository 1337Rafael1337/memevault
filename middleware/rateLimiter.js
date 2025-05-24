const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.originalUrl
        });
        res.status(429).json({
            message: 'Zu viele Anfragen, bitte versuchen Sie es später erneut.'
        });
    }
});

const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 Stunde
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Login rate limit exceeded', {
            ip: req.ip,
            username: req.body.username
        });
        res.status(429).json({
            message: 'Zu viele Login-Versuche, bitte versuchen Sie es später erneut.'
        });
    }
});

module.exports = {
    apiLimiter,
    loginLimiter
};