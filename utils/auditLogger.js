const logger = require('./logger');

// Lazy loading für das AuditLog Model um zirkuläre Abhängigkeiten zu vermeiden
let AuditLog;

const getAuditLogModel = () => {
    if (!AuditLog) {
        AuditLog = require('../models/AuditLog');
    }
    return AuditLog;
};

// Haupt-Audit-Logging-Funktion
const dbAuditLog = async (userId, action, details, req) => {
    try {
        const AuditLogModel = getAuditLogModel();

        const auditEntry = {
            userId: userId || null,
            action,
            details,
            ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
            userAgent: req?.headers?.['user-agent'] || 'unknown',
            timestamp: new Date()
        };

        await AuditLogModel.create(auditEntry);

        // Auch in die Log-Datei schreiben für redundante Sicherheit
        logger.info('Audit Log Entry', {
            ...auditEntry,
            userId: userId?.toString() // Für bessere Lesbarkeit in Logs
        });
    } catch (error) {
        // Fehler beim Audit-Logging sollten die Hauptoperation nicht beeinträchtigen
        logger.error('Failed to write audit log to database', {
            error: error.message,
            action,
            userId
        });
    }
};

// Spezifische Audit-Logging-Funktionen für verschiedene Aktionen

// Login-Versuche
const logLoginAttempt = async (username, success, reason, req) => {
    const action = success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED';
    await dbAuditLog(
        null, // userId ist bei fehlgeschlagenen Logins oft nicht verfügbar
        action,
        {
            username,
            reason,
            success
        },
        req
    );
};

// Passwort-Änderungen
const logPasswordChange = async (userId, success, req) => {
    const action = success ? 'PASSWORD_CHANGED' : 'PASSWORD_CHANGE_FAILED';
    await dbAuditLog(
        userId,
        action,
        {
            timestamp: new Date()
        },
        req
    );
};

// Admin-Aktionen
const logAdminAction = async (adminId, action, targetResource, details, req) => {
    await dbAuditLog(
        adminId,
        `ADMIN_${action}`,
        {
            targetResource,
            ...details
        },
        req
    );
};

// Datenzugriff
const logDataAccess = async (userId, resourceType, resourceId, action, req) => {
    await dbAuditLog(
        userId,
        'DATA_ACCESS',
        {
            resourceType,
            resourceId,
            action
        },
        req
    );
};

// Sicherheitsereignisse
const logSecurityEvent = async (eventType, details, req) => {
    await dbAuditLog(
        null,
        `SECURITY_${eventType}`,
        details,
        req
    );
};

// Spiel-bezogene Aktionen
const logGameAction = async (userId, gameId, action, details, req) => {
    await dbAuditLog(
        userId,
        `GAME_${action}`,
        {
            gameId,
            ...details
        },
        req
    );
};

// Fehlerhafte Anfragen
const logInvalidRequest = async (reason, details, req) => {
    await dbAuditLog(
        null,
        'INVALID_REQUEST',
        {
            reason,
            ...details
        },
        req
    );
};

// Rate Limit Überschreitungen
const logRateLimitExceeded = async (endpoint, req) => {
    await dbAuditLog(
        req?.user?.id || null,
        'RATE_LIMIT_EXCEEDED',
        {
            endpoint,
            ip: req?.ip
        },
        req
    );
};

// Utility-Funktion zum Bereinigen von Audit-Logs
const cleanupOldAuditLogs = async (daysToKeep = 90) => {
    try {
        const AuditLogModel = getAuditLogModel();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await AuditLogModel.deleteMany({
            timestamp: { $lt: cutoffDate }
        });

        logger.info('Cleaned up old audit logs', {
            deletedCount: result.deletedCount,
            cutoffDate
        });

        return result.deletedCount;
    } catch (error) {
        logger.error('Error cleaning up audit logs', { error: error.message });
        throw error;
    }
};

// Audit-Log-Statistiken abrufen
const getAuditLogStats = async (startDate, endDate) => {
    try {
        const AuditLogModel = getAuditLogModel();

        const stats = await AuditLogModel.aggregate([
            {
                $match: {
                    timestamp: {
                        $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: letzte 30 Tage
                        $lte: endDate || new Date()
                    }
                }
            },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        return stats;
    } catch (error) {
        logger.error('Error getting audit log stats', { error: error.message });
        throw error;
    }
};

module.exports = {
    dbAuditLog,
    logLoginAttempt,
    logPasswordChange,
    logAdminAction,
    logDataAccess,
    logSecurityEvent,
    logGameAction,
    logInvalidRequest,
    logRateLimitExceeded,
    cleanupOldAuditLogs,
    getAuditLogStats
};