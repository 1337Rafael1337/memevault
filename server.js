const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Utils
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('1. Starting server...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

console.log('2. Middleware added');

// MongoDB Verbindung
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/memevault')
    .then(() => {
        logger.info('Mit MongoDB verbunden');
    })
    .catch(err => {
        logger.error('MongoDB Verbindungsfehler:', err);
        process.exit(1);
    });

console.log('3. MongoDB connection initiated');

// Models
const User = require('./models/User');

// Basis Auth-Routen
app.post('/api/auth/setup-admin', async (req, res) => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin-Benutzer existiert bereits' });
        }

        const crypto = require('crypto');
        const tempPassword = crypto.randomBytes(8).toString('hex');

        const admin = new User({
            username: 'admin',
            password: tempPassword,
            role: 'admin'
        });

        await admin.save();

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

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Benutzername und Passwort sind erforderlich' });
        }

        const user = await User.findOne({ username });
        if (!user || !user.active) {
            return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
        }

        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'dein-sicheres-jwt-geheimnis-aendern-in-produktion',
            { expiresIn: '1h' }
        );

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

console.log('4. Basic auth routes added');

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

console.log('5. Health check added');

// Route Module laden
try {
    console.log('6. Loading auth routes...');
    const authRoutes = require('./routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('   ✓ Auth routes loaded');
} catch (error) {
    console.error('   ✗ Auth routes error:', error.message);
}

try {
    console.log('7. Loading game routes...');
    const gameRoutes = require('./routes/games');
    app.use('/api/games', gameRoutes);
    console.log('   ✓ Game routes loaded');
} catch (error) {
    console.error('   ✗ Game routes error:', error.message);
}

try {
    console.log('8. Loading admin routes...');
    const adminRoutes = require('./routes/admin');
    app.use('/api/admin', adminRoutes);
    console.log('   ✓ Admin routes loaded');
} catch (error) {
    console.error('   ✗ Admin routes error:', error.message);
}

console.log('9. Adding 404 handler...');

// 404 Handler - HIER KÖNNTE DER FEHLER SEIN!
// Der Wildcard könnte das Problem sein
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ message: 'API-Endpunkt nicht gefunden' });
    } else {
        next();
    }
});

console.log('10. 404 handler added');

console.log('11. Checking production mode...');

// Production - KOMMENTIEREN WIR DAS MAL AUS
/*
if (process.env.NODE_ENV === 'production') {
    console.log('12. Adding production routes...');
    app.use(express.static(path.join(__dirname, 'client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });
    console.log('13. Production routes added');
}
*/

console.log('14. Adding error handler...');

// Error Handler
app.use((err, req, res, next) => {
    logger.logError(err, req);

    const message = process.env.NODE_ENV === 'production'
        ? 'Interner Serverfehler'
        : err.message;

    res.status(err.status || 500).json({ message });
});

console.log('15. Error handler added');

// Upload-Ordner
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
    logger.info('Upload-Ordner erstellt');
}

console.log('16. Starting server...');

// Server starten
const server = app.listen(PORT, () => {
    logger.info(`Server läuft auf Port ${PORT}`);
    console.log(`Server läuft auf http://localhost:${PORT}`);
    console.log('17. Server started successfully!');
});

// Error handlers
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('\n❌ Uncaught Exception:', err.message);
    if (err.stack) {
        console.error('Stack trace:', err.stack);
    }
});