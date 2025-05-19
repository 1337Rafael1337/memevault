const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Konfigurationen für Authentifizierung
const JWT_SECRET = process.env.JWT_SECRET || 'dein-sicheres-jwt-geheimnis-aendern-in-produktion';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';

// Logger-Konfiguration
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

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
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'security.log'),
            level: 'info',
            handleExceptions: true,
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log')
        })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

// Multer Konfiguration für Datei-Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Fehler: Nur Bilder sind erlaubt!');
        }
    }
});

// MongoDB Verbindung
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/memevault')
    .then(() => console.log('Mit MongoDB verbunden'))
    .catch(err => console.error('MongoDB Verbindungsfehler:', err));

// Modelle
const imageSchema = new mongoose.Schema({
    title: String,
    imagePath: String,
    createdAt: { type: Date, default: Date.now },
    ipAddress: String,
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' }
});

const memeSchema = new mongoose.Schema({
    imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
    topText: String,
    bottomText: String,
    fontType: String,
    createdAt: { type: Date, default: Date.now },
    ipAddress: String,
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    creator: String
});

const voteSchema = new mongoose.Schema({
    memeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meme' },
    voteType: Boolean, // true für positiv, false für negativ
    createdAt: { type: Date, default: Date.now },
    ipAddress: String,
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    voter: String
});

const gameSchema = new mongoose.Schema({
    name: String,
    creator: String,
    code: {
        type: String,
        unique: true,
        default: () => Math.random().toString(36).substring(2, 8).toUpperCase()
    },
    status: {
        type: String,
        enum: ['collecting', 'creating', 'voting', 'completed'],
        default: 'collecting'
    },
    participants: [String], // Namen der Teilnehmer
    createdAt: { type: Date, default: Date.now },
    phaseEndTime: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) }
});

// Audit-Log-Modell 
const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
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

// User-Modell
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Benutzername ist erforderlich'],
        unique: true,
        trim: true,
        minlength: [4, 'Benutzername muss mindestens 4 Zeichen lang sein']
    },
    password: {
        type: String,
        required: [true, 'Passwort ist erforderlich'],
        minlength: [8, 'Passwort muss mindestens 8 Zeichen lang sein']
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    lastLogin: {
        type: Date,
        default: null
    },
    active: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Validiere unique fields
userSchema.plugin(uniqueValidator, { message: '{PATH} existiert bereits' });

// Hash-Passwort vor dem Speichern
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Passwort-Vergleichsmethode
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const Image = mongoose.model('Image', imageSchema);
const Meme = mongoose.model('Meme', memeSchema);
const Vote = mongoose.model('Vote', voteSchema);
const Game = mongoose.model('Game', gameSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const User = mongoose.model('User', userSchema);

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

// Rate Limiter für API
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
            message: 'Zu viele Anfragen, bitte versuchen Sie es später erneut.'
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
            message: 'Zu viele Login-Versuche, bitte versuchen Sie es später erneut.'
        });
    }
});

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

// Routen

// ===== AUTH ROUTEN =====

// Login-Route
app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validierung
        if (!username || !password) {
            return res.status(400).json({ message: 'Benutzername und Passwort sind erforderlich' });
        }

        // Benutzer suchen
        const user = await User.findOne({ username });

        // Generischer Fehler, um User Enumeration zu verhindern
        if (!user || !user.active) {
            logger.info('Failed login attempt', {
                username,
                reason: user ? 'Inactive account' : 'User not found',
                ip: req.ip
            });
            return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
        }

        // Passwort prüfen
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            // Login-Versuch loggen
            await dbAuditLog(
                user._id,
                'FAILED_LOGIN',
                { reason: 'Invalid password' },
                req
            );

            return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
        }

        // Login-Zeit aktualisieren
        user.lastLogin = new Date();
        await user.save();

        // Erfolgreichen Login loggen
        await dbAuditLog(
            user._id,
            'LOGIN_SUCCESS',
            { username: user.username },
            req
        );

        // Token generieren und senden
        const token = generateToken(user);
        res.json({
            message: 'Login erfolgreich',
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        logger.error('Login error', { error });
        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
});

// Passwort ändern
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Validierung
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: 'Aktuelles Passwort und neues Passwort sind erforderlich'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: 'Neues Passwort muss mindestens 8 Zeichen lang sein'
            });
        }

        // Benutzer finden
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        // Aktuelles Passwort prüfen
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            // Fehlgeschlagenen Versuch loggen
            await dbAuditLog(
                userId,
                'PASSWORD_CHANGE_FAILED',
                { reason: 'Invalid current password' },
                req
            );

            return res.status(401).json({ message: 'Aktuelles Passwort ist falsch' });
        }

        // Passwort aktualisieren
        user.password = newPassword;
        await user.save();

        // Erfolg loggen
        await dbAuditLog(
            userId,
            'PASSWORD_CHANGED',
            { username: user.username },
            req
        );

        res.json({ message: 'Passwort erfolgreich geändert' });
    } catch (error) {
        logger.error('Error changing password', { error });
        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
});

// Admin-User erstellen (nur für initiale Setup)
app.post('/api/auth/setup-admin', async (req, res) => {
    try {
        // Prüfen, ob bereits Admin existiert
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin-Benutzer existiert bereits' });
        }

        // Generiert einen sicheren Zufallswert für Passwort
        const crypto = require('crypto');
        const tempPassword = crypto.randomBytes(8).toString('hex');

        // Admin erstellen
        const admin = new User({
            username: 'admin',
            password: tempPassword,
            role: 'admin'
        });

        await admin.save();

        // Loggen und Antwort senden
        logger.info('Admin user created');
        res.status(201).json({
            message: 'Admin-Benutzer erfolgreich erstellt',
            initialPassword: tempPassword,
            note: 'Bitte ändern Sie dieses Passwort sofort nach der ersten Anmeldung'
        });
    } catch (error) {
        logger.error('Error creating admin user', { error });
        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
});

// ===== SPIEL-ROUTEN =====

// Spiel erstellen
app.post('/api/games/create', async (req, res) => {
    try {
        const { name, creatorName } = req.body;

        const newGame = new Game({
            name,
            creator: creatorName,
            participants: [creatorName]
        });

        await newGame.save();
        res.status(201).json(newGame);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Spiel beitreten
app.post('/api/games/join', async (req, res) => {
    try {
        const { code, playerName } = req.body;

        const game = await Game.findOne({ code: code.toUpperCase() });
        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        if (game.status !== 'collecting') {
            return res.status(400).json({ message: 'Diesem Spiel kann nicht mehr beigetreten werden' });
        }

        // Teilnehmer hinzufügen
        if (!game.participants.includes(playerName)) {
            game.participants.push(playerName);
            await game.save();
        }

        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Alle Spiele abrufen
app.get('/api/games', async (req, res) => {
    try {
        const games = await Game.find().sort({ createdAt: -1 });
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Spiel-Details abrufen
app.get('/api/games/:id', async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }
        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Phase wechseln
app.post('/api/games/:id/next-phase', async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);

        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        // Phasenwechsel
        switch (game.status) {
            case 'collecting':
                game.status = 'creating';
                break;
            case 'creating':
                game.status = 'voting';
                break;
            case 'voting':
                game.status = 'completed';
                break;
        }

        // Neue Zeitbegrenzung
        game.phaseEndTime = new Date(Date.now() + 10 * 60 * 1000);

        await game.save();
        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Bilder für ein Spiel hochladen
app.post('/api/games/:gameId/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Kein Bild hochgeladen' });
        }

        const game = await Game.findById(req.params.gameId);
        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        if (game.status !== 'collecting') {
            return res.status(400).json({ message: 'In dieser Phase können keine Bilder mehr hochgeladen werden' });
        }

        const newImage = new Image({
            title: req.body.title || 'Unbenannt',
            imagePath: req.file.filename,
            ipAddress: req.ip,
            gameId: req.params.gameId
        });

        await newImage.save();
        res.status(201).json(newImage);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Bilder für ein Spiel abrufen
app.get('/api/games/:gameId/images', async (req, res) => {
    try {
        const images = await Image.find({ gameId: req.params.gameId }).sort({ createdAt: -1 });
        res.json(images);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Meme für ein Spiel erstellen
app.post('/api/games/:gameId/memes/create', async (req, res) => {
    try {
        const { imageId, topText, bottomText, fontType, creator } = req.body;

        const game = await Game.findById(req.params.gameId);
        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        if (game.status !== 'creating') {
            return res.status(400).json({ message: 'In dieser Phase können keine Memes mehr erstellt werden' });
        }

        const newMeme = new Meme({
            imageId,
            topText,
            bottomText,
            fontType,
            ipAddress: req.ip,
            gameId: req.params.gameId,
            creator
        });

        await newMeme.save();
        res.status(201).json(newMeme);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Memes für ein Spiel abrufen
app.get('/api/games/:gameId/memes', async (req, res) => {
    try {
        const memes = await Meme.find({ gameId: req.params.gameId })
            .populate('imageId')
            .sort({ createdAt: -1 });
        res.json(memes);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Für ein Meme im Spiel abstimmen
app.post('/api/games/:gameId/memes/:memeId/vote', async (req, res) => {
    try {
        const { voter } = req.body;

        const game = await Game.findById(req.params.gameId);
        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        if (game.status !== 'voting') {
            return res.status(400).json({ message: 'In dieser Phase kann nicht abgestimmt werden' });
        }

        const existingVote = await Vote.findOne({
            memeId: req.params.memeId,
            ipAddress: req.ip,
            gameId: req.params.gameId
        });

        if (existingVote) {
            return res.status(400).json({ message: 'Du hast bereits abgestimmt' });
        }

        const newVote = new Vote({
            memeId: req.params.memeId,
            voteType: true,
            ipAddress: req.ip,
            gameId: req.params.gameId,
            voter
        });

        await newVote.save();
        res.status(201).json(newVote);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Abstimmungsergebnisse für ein Spiel abrufen
app.get('/api/games/:gameId/results', async (req, res) => {
    try {
        const memes = await Meme.find({ gameId: req.params.gameId }).populate('imageId');

        const results = await Promise.all(
            memes.map(async (meme) => {
                const votes = await Vote.find({ memeId: meme._id, gameId: req.params.gameId });
                return {
                    meme,
                    votes: votes.length
                };
            })
        );

        // Nach Stimmen sortieren
        results.sort((a, b) => b.votes - a.votes);

        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// ===== ABGESICHERTE ADMIN-ROUTEN =====
// Die bestehenden Admin-Routen mit Authentifizierung und Zugriffskontrolle sichern
app.use('/api/admin', apiLimiter, authMiddleware, requireRole('admin'));

// Alle Spiele mit detaillierten Informationen abrufen
app.get('/api/admin/games', async (req, res) => {
    try {
        const games = await Game.find().sort({ createdAt: -1 });

        // Erweiterte Informationen für jedes Spiel abrufen
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

        res.json(gamesWithDetails);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Spiel-Status manuell ändern
app.post('/api/admin/games/:id/change-status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!['collecting', 'creating', 'voting', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'Ungültiger Status' });
        }

        const game = await Game.findById(req.params.id);

        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        game.status = status;
        game.phaseEndTime = new Date(Date.now() + 10 * 60 * 1000);

        await game.save();
        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Spiel löschen
app.delete('/api/admin/games/:id', async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);

        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        // Zugehörige Bilder, Memes und Votes löschen
        const images = await Image.find({ gameId: game._id });

        // Bilder aus dem Dateisystem löschen
        for (const image of images) {
            const imagePath = path.join(__dirname, 'uploads', image.imagePath);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Datenbank-Einträge löschen
        await Image.deleteMany({ gameId: game._id });
        await Meme.deleteMany({ gameId: game._id });
        await Vote.deleteMany({ gameId: game._id });

        // Spiel löschen
        await Game.findByIdAndDelete(req.params.id);

        res.json({ message: 'Spiel und zugehörige Daten wurden gelöscht' });
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Anpassung der Content-Type-Header bei Statischen Dateien im Produktionsmodus
if (process.env.NODE_ENV === 'production') {
    // Statische Dateien servieren
    app.use(express.static(path.join(__dirname, 'client/build')));

    // Alle nicht-API-Anfragen zur React-App weiterleiten
    app.get('*', (req, res, next) => {
        if (req.url.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });
}

// Verbesserte Fehlerbehandlung hinzufügen
app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.status(500).send('Server error: ' + (process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message));
});

// Upload-Ordner erstellen, falls er nicht existiert
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});