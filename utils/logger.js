const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Stelle sicher, dass das logs-Verzeichnis existiert
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Definiere Logger-Konfiguration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'memevault-api' },
    transports: [
        // Fehler und kritische Logs in separate Dateien schreiben
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error'
        }),
        // Security-Logs in separate Datei
        new winston.transports.File({
            filename: path.join(logDir, 'security.log'),
            level: 'info',
            handleExceptions: true,
        }),
        // Alle Logs in eine Datei
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log')
        })
    ]
});

// Im Entwicklungsmodus auch in die Konsole loggen
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Audit-Logging-Funktion
const auditLog = (userId, action, details) => {
    logger.info({
        type: 'AUDIT',
        userId,
        action,
        details,
        timestamp: new Date().toISOString()
    });
};

// Mongoose Audit-Log-Modell erstellen
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Erlaubt anonyme Logs
    },
    action: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Audit-Logging zur Datenbank
const dbAuditLog = async (userId, action, details, req) => {
    try {
        await AuditLog.create({
            userId: userId || null,
            action,
            details,
            ipAddress: req?.ip || 'unknown',
            userAgent: req?.headers?.['user-agent'] || 'unknown'
        });
    } catch (error) {
        logger.error('Failed to write audit log to database', { error });
    }
};

module.exports = {
    logger,
    auditLog,
    dbAuditLog,
    AuditLog
};