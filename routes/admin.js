const router = require('express').Router();
const path = require('path');
const fs = require('fs').promises;

// Controllers
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

// Models
const Game = require('../models/Game');
const Image = require('../models/Image');
const Meme = require('../models/Meme');
const Vote = require('../models/Vote');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Utils
const { authMiddleware, requireRole } = require('../utils/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const {
    logAdminAction,
    getAuditLogStats,
    dbAuditLog
} = require('../utils/auditLogger');
const {
    runMainCleanup,
    checkDiskSpace,
    cleanupOldGames,
    cleanupOrphanedImages
} = require('../cron');

// Middleware für alle Admin-Routen
router.use(apiLimiter, authMiddleware, requireRole('admin'));

// ===== BENUTZER-VERWALTUNG =====

// Alle Benutzer abrufen
router.get('/users', authController.getAllUsers);

// Neuen Benutzer erstellen
router.post('/users', authController.createUser);

// Benutzer aktivieren/deaktivieren
router.patch('/users/:userId/toggle-status', authController.toggleUserStatus);

// Benutzer löschen
router.delete('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Verhindere Selbstlöschung
        if (userId === req.user.id) {
            return res.status(400).json({
                message: 'Sie können Ihren eigenen Account nicht löschen'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        // Verhindere Löschung des letzten Admins
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: 'Der letzte Admin-Account kann nicht gelöscht werden'
                });
            }
        }

        await User.findByIdAndDelete(userId);

        await logAdminAction(
            req.user.id,
            'DELETED_USER',
            'User',
            {
                deletedUserId: userId,
                deletedUsername: user.username
            },
            req
        );

        res.json({ message: 'Benutzer erfolgreich gelöscht' });
    } catch (error) {
        logger.error('Error deleting user', { error: error.message });
        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
});

// ===== SPIEL-VERWALTUNG =====

// Alle Spiele mit Details abrufen
router.get('/games', async (req, res) => {
    try {
        const games = await Game.find().sort({ createdAt: -1 });

        const gamesWithDetails = await Promise.all(games.map(async game => {
            const imageCount = await Image.countDocuments({ gameId: game._id });
            const memeCount = await Meme.countDocuments({ gameId: game._id });
            const voteCount = await Vote.countDocuments({ gameId: game._id });

            return {
                ...game.toObject(),
                stats: {
                    imageCount,
                    memeCount,
                    voteCount
                }
            };
        }));

        await logAdminAction(
            req.user.id,
            'VIEWED_ALL_GAMES',
            'Game',
            { count: games.length },
            req
        );

        res.json(gamesWithDetails);
    } catch (error) {
        logger.error('Error fetching games', { error: error.message });
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Spiel-Details mit allen zugehörigen Daten
router.get('/games/:id/details', async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        const images = await Image.find({ gameId: game._id });
        const memes = await Meme.find({ gameId: game._id }).populate('imageId');
        const votes = await Vote.find({ gameId: game._id });

        const memeVotes = {};
        votes.forEach(vote => {
            const memeId = vote.memeId.toString();
            memeVotes[memeId] = (memeVotes[memeId] || 0) + 1;
        });

        res.json({
            game,
            images,
            memes: memes.map(meme => ({
                ...meme.toObject(),
                voteCount: memeVotes[meme._id.toString()] || 0
            })),
            totalVotes: votes.length
        });
    } catch (error) {
        logger.error('Error fetching game details', { error: error.message });
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Spiel-Status ändern
router.patch('/games/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!['collecting', 'creating', 'voting', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'Ungültiger Status' });
        }

        const game = await Game.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        const oldStatus = game.status;
        game.status = status;
        game.phaseEndTime = new Date(Date.now() + 10 * 60 * 1000);

        await game.save();

        await logAdminAction(
            req.user.id,
            'CHANGED_GAME_STATUS',
            'Game',
            {
                gameId: game._id,
                gameName: game.name,
                oldStatus,
                newStatus: status
            },
            req
        );

        res.json(game);
    } catch (error) {
        logger.error('Error changing game status', { error: error.message });
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Spiel löschen
router.delete('/games/:id', async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        // Bilder aus dem Dateisystem löschen
        const images = await Image.find({ gameId: game._id });
        let deletedFiles = 0;

        for (const image of images) {
            const imagePath = path.join(__dirname, '..', 'uploads', image.imagePath);
            try {
                await fs.unlink(imagePath);
                deletedFiles++;
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    logger.error('Error deleting image file', {
                        path: imagePath,
                        error: err.message
                    });
                }
            }
        }

        // Datenbank-Einträge löschen
        await Image.deleteMany({ gameId: game._id });
        await Meme.deleteMany({ gameId: game._id });
        await Vote.deleteMany({ gameId: game._id });
        await Game.findByIdAndDelete(req.params.id);

        await logAdminAction(
            req.user.id,
            'DELETED_GAME',
            'Game',
            {
                gameId: game._id,
                gameName: game.name,
                deletedFiles
            },
            req
        );

        res.json({
            message: 'Spiel und zugehörige Daten wurden gelöscht',
            deletedFiles
        });
    } catch (error) {
        logger.error('Error deleting game', { error: error.message });
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// ===== SYSTEM-VERWALTUNG =====

// Dashboard-Statistiken
router.get('/dashboard', async (req, res) => {
    try {
        const [
            totalGames,
            activeGames,
            completedGames,
            totalUsers,
            activeUsers,
            totalImages,
            totalMemes,
            totalVotes,
            diskSpace
        ] = await Promise.all([
            Game.countDocuments(),
            Game.countDocuments({ status: { $ne: 'completed' } }),
            Game.countDocuments({ status: 'completed' }),
            User.countDocuments(),
            User.countDocuments({ active: true }),
            Image.countDocuments(),
            Meme.countDocuments(),
            Vote.countDocuments(),
            checkDiskSpace()
        ]);

        // Aktivität der letzten 7 Tage
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [
            recentGames,
            recentMemes,
            recentVotes,
            recentLogins
        ] = await Promise.all([
            Game.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            Meme.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            Vote.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            AuditLog.countDocuments({
                action: 'LOGIN_SUCCESS',
                timestamp: { $gte: sevenDaysAgo }
            })
        ]);

        res.json({
            overview: {
                totalGames,
                activeGames,
                completedGames,
                totalUsers,
                activeUsers,
                totalImages,
                totalMemes,
                totalVotes
            },
            recentActivity: {
                games: recentGames,
                memes: recentMemes,
                votes: recentVotes,
                logins: recentLogins,
                period: '7 days'
            },
            storage: diskSpace,
            serverInfo: {
                uptime: process.uptime(),
                nodeVersion: process.version,
                environment: process.env.NODE_ENV || 'development'
            }
        });
    } catch (error) {
        logger.error('Error fetching dashboard data', { error: error.message });
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Audit-Log-Statistiken
router.get('/audit-stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const stats = await getAuditLogStats(start, end);

        res.json({
            period: { start, end },
            stats
        });
    } catch (error) {
        logger.error('Error fetching audit stats', { error: error.message });
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Letzte Audit-Logs abrufen
router.get('/audit-logs', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;

        const logs = await AuditLog.find()
            .populate('userId', 'username')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));

        const total = await AuditLog.countDocuments();

        res.json({
            logs,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        logger.error('Error fetching audit logs', { error: error.message });
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Speicherplatz-Status
router.get('/storage-status', async (req, res) => {
    try {
        const status = await checkDiskSpace();
        res.json(status);
    } catch (error) {
        logger.error('Error checking storage', { error: error.message });
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// ===== WARTUNG =====

// Manueller Cleanup
router.post('/maintenance/cleanup', async (req, res) => {
    try {
        const { type = 'all' } = req.body;

        await logAdminAction(
            req.user.id,
            'INITIATED_CLEANUP',
            'System',
            { type },
            req
        );

        let result = {};

        switch (type) {
            case 'games':
                result = await cleanupOldGames();
                break;
            case 'images':
                result = await cleanupOrphanedImages();
                break;
            case 'all':
                await runMainCleanup();
                result = { message: 'Vollständiger Cleanup durchgeführt' };
                break;
            default:
                return res.status(400).json({ message: 'Ungültiger Cleanup-Typ' });
        }

        res.json({
            message: 'Cleanup erfolgreich durchgeführt',
            result
        });
    } catch (error) {
        logger.error('Error during manual cleanup', { error: error.message });
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Server-Logs abrufen (nur die letzten Zeilen)
router.get('/logs/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { lines = 100 } = req.query;

        const validTypes = ['combined', 'error', 'security'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Ungültiger Log-Typ' });
        }

        const logPath = path.join(__dirname, '..', 'logs', `${type}.log`);

        try {
            const content = await fs.readFile(logPath, 'utf8');
            const logLines = content.split('\n').filter(line => line.trim());
            const recentLines = logLines.slice(-parseInt(lines));

            res.json({
                type,
                lines: recentLines.map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return { raw: line };
                    }
                }),
                total: logLines.length
            });
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.json({ type, lines: [], total: 0 });
            }
            throw err;
        }
    } catch (error) {
        logger.error('Error reading logs', { error: error.message });
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// System-Health-Check
router.get('/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

        const health = {
            status: 'OK',
            timestamp: new Date(),
            uptime: process.uptime(),
            database: dbStatus,
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        };

        res.json(health);
    } catch (error) {
        logger.error('Error in health check', { error: error.message });
        res.status(500).json({
            status: 'ERROR',
            message: 'Health check failed'
        });
    }
});

module.exports = router;