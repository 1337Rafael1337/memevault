const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Log-Verzeichnis erstellen, falls es nicht existiert
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Custom Log-Format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console Log-Format für Entwicklung
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Logger-Konfiguration
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'memevault-api' },
    transports: [
        // Error-Log
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Security-Log (für Audit-relevante Logs)
        new winston.transports.File({
            filename: path.join(logDir, 'security.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 10,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        // Combined-Log (alle Logs)
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        })
    ],
    // Exception Handler
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'exceptions.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ],
    // Rejection Handler
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'rejections.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

// Console-Transport nur in Entwicklung
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true
    }));
}

// Stream für Morgan (HTTP Request Logging)
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

// Utility-Funktionen für strukturiertes Logging
logger.logRequest = (req, additionalInfo = {}) => {
    logger.info('HTTP Request', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        ...additionalInfo
    });
};

logger.logResponse = (req, res, additionalInfo = {}) => {
    logger.info('HTTP Response', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: res.get('X-Response-Time'),
        ...additionalInfo
    });
};

logger.logError = (error, req = null, additionalInfo = {}) => {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...additionalInfo
    };

    if (req) {
        errorInfo.request = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('user-agent')
        };
    }

    logger.error('Application Error', errorInfo);
};

logger.logSecurity = (event, details = {}) => {
    logger.warn(`Security Event: ${event}`, details);
};

module.exports = logger;