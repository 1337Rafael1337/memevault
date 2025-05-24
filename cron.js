const cron = require('node-cron');
const logger = require('./utils/logger');
const { cleanupOldAuditLogs } = require('./utils/auditLogger');
const Game = require('./models/Game');
const Image = require('./models/Image');
const fs = require('fs').promises;
const path = require('path');

// Cron-Job-Konfiguration
const CLEANUP_SCHEDULE = process.env.CLEANUP_SCHEDULE || '0 0 * * *'; // Täglich um Mitternacht
const AUDIT_LOG_RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90;
const GAME_RETENTION_DAYS = parseInt(process.env.GAME_RETENTION_DAYS) || 30;
const ORPHANED_IMAGE_CHECK_SCHEDULE = '0 2 * * *'; // Täglich um 2 Uhr morgens

// Funktion zum Bereinigen alter Spiele
const cleanupOldGames = async () => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - GAME_RETENTION_DAYS);

        // Finde alte, abgeschlossene Spiele
        const oldGames = await Game.find({
            status: 'completed',
            createdAt: { $lt: cutoffDate }
        });

        logger.info(`Found ${oldGames.length} old games to clean up`);

        let deletedGames = 0;
        let deletedImages = 0;

        for (const game of oldGames) {
            try {
                // Finde alle Bilder des Spiels
                const images = await Image.find({ gameId: game._id });

                // Lösche physische Bilddateien
                for (const image of images) {
                    const imagePath = path.join(__dirname, 'uploads', image.imagePath);
                    try {
                        await fs.unlink(imagePath);
                        deletedImages++;
                    } catch (err) {
                        if (err.code !== 'ENOENT') {
                            logger.error('Error deleting image file', {
                                path: imagePath,
                                error: err.message
                            });
                        }
                    }
                }

                // Lösche Datenbankeinträge
                await Image.deleteMany({ gameId: game._id });
                await require('./models/Meme').deleteMany({ gameId: game._id });
                await require('./models/Vote').deleteMany({ gameId: game._id });

                // Lösche das Spiel selbst
                await Game.findByIdAndDelete(game._id);
                deletedGames++;

            } catch (error) {
                logger.error('Error cleaning up game', {
                    gameId: game._id,
                    error: error.message
                });
            }
        }

        logger.info('Game cleanup completed', {
            deletedGames,
            deletedImages,
            retentionDays: GAME_RETENTION_DAYS
        });

        return { deletedGames, deletedImages };
    } catch (error) {
        logger.error('Error in game cleanup job', { error: error.message });
        throw error;
    }
};

// Funktion zum Bereinigen verwaister Bilder
const cleanupOrphanedImages = async () => {
    try {
        // Finde alle Bilddateien im Upload-Verzeichnis
        const uploadDir = path.join(__dirname, 'uploads');
        const files = await fs.readdir(uploadDir);

        const imageFiles = files.filter(file =>
            /\.(jpg|jpeg|png|gif)$/i.test(file)
        );

        logger.info(`Checking ${imageFiles.length} image files for orphans`);

        let orphanedCount = 0;

        for (const file of imageFiles) {
            // Prüfe ob das Bild in der Datenbank existiert
            const imageExists = await Image.findOne({ imagePath: file });

            if (!imageExists) {
                // Bild ist verwaist - lösche es
                const filePath = path.join(uploadDir, file);
                try {
                    await fs.unlink(filePath);
                    orphanedCount++;
                    logger.info('Deleted orphaned image', { file });
                } catch (err) {
                    logger.error('Error deleting orphaned image', {
                        file,
                        error: err.message
                    });
                }
            }
        }

        logger.info('Orphaned image cleanup completed', {
            orphanedCount,
            totalChecked: imageFiles.length
        });

        return orphanedCount;
    } catch (error) {
        logger.error('Error in orphaned image cleanup job', { error: error.message });
        throw error;
    }
};

// Funktion zum Überprüfen des Speicherplatzes
const checkDiskSpace = async () => {
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        const files = await fs.readdir(uploadDir);

        let totalSize = 0;

        for (const file of files) {
            const filePath = path.join(uploadDir, file);
            try {
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
            } catch (err) {
                // Datei könnte gelöscht worden sein
            }
        }

        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

        logger.info('Upload directory size check', {
            totalFiles: files.length,
            totalSizeMB,
            totalSizeBytes: totalSize
        });

        // Warnung bei über 1GB
        if (totalSize > 1024 * 1024 * 1024) {
            logger.warn('Upload directory size exceeds 1GB', {
                totalSizeMB,
                recommendation: 'Consider reducing retention period or increasing storage'
            });
        }

        return { totalFiles: files.length, totalSizeMB, totalSizeBytes: totalSize };
    } catch (error) {
        logger.error('Error checking disk space', { error: error.message });
        throw error;
    }
};

// Haupt-Cleanup-Job
const runMainCleanup = async () => {
    logger.info('Starting scheduled cleanup jobs');

    const results = {
        auditLogs: null,
        games: null,
        orphanedImages: null,
        diskSpace: null
    };

    try {
        // Audit-Logs bereinigen
        try {
            const deletedAuditLogs = await cleanupOldAuditLogs(AUDIT_LOG_RETENTION_DAYS);
            results.auditLogs = { success: true, deleted: deletedAuditLogs };
        } catch (error) {
            results.auditLogs = { success: false, error: error.message };
        }

        // Alte Spiele bereinigen
        try {
            const gameResults = await cleanupOldGames();
            results.games = { success: true, ...gameResults };
        } catch (error) {
            results.games = { success: false, error: error.message };
        }

        // Verwaiste Bilder bereinigen
        try {
            const orphanedCount = await cleanupOrphanedImages();
            results.orphanedImages = { success: true, deleted: orphanedCount };
        } catch (error) {
            results.orphanedImages = { success: false, error: error.message };
        }

        // Speicherplatz prüfen
        try {
            const diskSpace = await checkDiskSpace();
            results.diskSpace = { success: true, ...diskSpace };
        } catch (error) {
            results.diskSpace = { success: false, error: error.message };
        }

        logger.info('Scheduled cleanup jobs completed', results);
    } catch (error) {
        logger.error('Critical error in cleanup jobs', { error: error.message });
    }
};

// Cron-Jobs initialisieren
const initializeCronJobs = () => {
    // Haupt-Cleanup-Job
    cron.schedule(CLEANUP_SCHEDULE, runMainCleanup, {
        scheduled: true,
        timezone: process.env.TZ || 'Europe/Berlin'
    });

    logger.info('Cron jobs initialized', {
        cleanupSchedule: CLEANUP_SCHEDULE,
        timezone: process.env.TZ || 'Europe/Berlin',
        auditLogRetention: AUDIT_LOG_RETENTION_DAYS,
        gameRetention: GAME_RETENTION_DAYS
    });

    // Optional: Sofortiger Test-Lauf beim Start (nur in Entwicklung)
    if (process.env.NODE_ENV === 'development' && process.env.RUN_CLEANUP_ON_START === 'true') {
        logger.info('Running cleanup jobs on startup (development mode)');
        runMainCleanup();
    }
};

// Export für manuellen Aufruf
module.exports = {
    initializeCronJobs,
    runMainCleanup,
    cleanupOldGames,
    cleanupOrphanedImages,
    checkDiskSpace
};