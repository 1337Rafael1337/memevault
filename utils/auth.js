const jwt = require('jsonwebtoken');
const { logger, dbAuditLog } = require('./logger');

// Sollte in .env gespeichert werden
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret-key-replace-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';

// Token erstellen
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
};

// Auth Middleware
const authMiddleware = (req, res, next) => {
    try {
        // Token aus Header extrahieren
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Token verifizieren
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        next();
    } catch (error) {
        logger.error('Authentication error', { error: error.message });
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

// Rollen-basierte Zugriffskontrolle
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (req.user.role !== role) {
            // Unberechtigten Zugriff loggen
            dbAuditLog(
                req.user.id,
                'UNAUTHORIZED_ACCESS_ATTEMPT',
                {
                    requiredRole: role,
                    userRole: req.user.role,
                    endpoint: req.originalUrl
                },
                req
            );

            return res.status(403).json({ message: 'Access denied' });
        }

        next();
    };
};

module.exports = {
    generateToken,
    authMiddleware,
    requireRole
};