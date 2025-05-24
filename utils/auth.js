const jwt = require('jsonwebtoken');
const logger = require('./logger');
const { dbAuditLog } = require('./auditLogger');

// JWT Konfiguration aus Umgebungsvariablen
const JWT_SECRET = process.env.JWT_SECRET || 'dein-sicheres-jwt-geheimnis-aendern-in-produktion';
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
            return res.status(401).json({ message: 'Authentifizierung erforderlich' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentifizierung erforderlich' });
        }

        // Token verifizieren
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        next();
    } catch (error) {
        logger.error('Authentication error', { error: error.message });

        // Spezifische Fehlerbehandlung für verschiedene JWT-Fehler
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token abgelaufen' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Ungültiger Token' });
        }

        return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen' });
    }
};

// Rollen-basierte Zugriffskontrolle
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentifizierung erforderlich' });
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

            return res.status(403).json({ message: 'Zugriff verweigert' });
        }

        next();
    };
};

// Mehrere Rollen erlauben
const requireAnyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentifizierung erforderlich' });
        }

        if (!roles.includes(req.user.role)) {
            // Unberechtigten Zugriff loggen
            dbAuditLog(
                req.user.id,
                'UNAUTHORIZED_ACCESS_ATTEMPT',
                {
                    requiredRoles: roles,
                    userRole: req.user.role,
                    endpoint: req.originalUrl
                },
                req
            );

            return res.status(403).json({ message: 'Zugriff verweigert' });
        }

        next();
    };
};

// Optional: Token aus Request extrahieren (für andere Verwendungszwecke)
const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return null;
};

// Optional: User-Informationen aus Token dekodieren ohne Verifizierung
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        logger.error('Error decoding token', { error });
        return null;
    }
};

// Token verifizieren (für manuelle Überprüfung)
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

module.exports = {
    generateToken,
    authMiddleware,
    requireRole,
    requireAnyRole,
    extractToken,
    decodeToken,
    verifyToken,
    JWT_SECRET,
    JWT_EXPIRY
};