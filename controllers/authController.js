const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');
const { generateToken } = require('../utils/auth');
const {
    logLoginAttempt,
    logPasswordChange,
    logAdminAction,
    dbAuditLog
} = require('../utils/auditLogger');

// Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validierung
        if (!username || !password) {
            await logLoginAttempt(username || 'unknown', false, 'Missing credentials', req);
            return res.status(400).json({ message: 'Benutzername und Passwort sind erforderlich' });
        }

        // Benutzer suchen
        const user = await User.findOne({ username });

        // Generischer Fehler, um User Enumeration zu verhindern
        if (!user || !user.active) {
            const reason = user ? 'Inactive account' : 'User not found';
            await logLoginAttempt(username, false, reason, req);

            logger.info('Failed login attempt', {
                username,
                reason,
                ip: req.ip
            });

            return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
        }

        // Passwort prüfen
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            await logLoginAttempt(username, false, 'Invalid password', req);
            return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
        }

        // Login-Zeit aktualisieren
        user.lastLogin = new Date();
        await user.save();

        // Erfolgreichen Login loggen
        await logLoginAttempt(username, true, 'Valid credentials', req);

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
        logger.error('Login error', { error: error.message });
        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
};

// Passwort ändern
exports.changePassword = async (req, res) => {
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

        // Prüfen ob neues Passwort != altes Passwort
        if (currentPassword === newPassword) {
            return res.status(400).json({
                message: 'Neues Passwort darf nicht mit dem aktuellen Passwort identisch sein'
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
            await logPasswordChange(userId, false, req);
            return res.status(401).json({ message: 'Aktuelles Passwort ist falsch' });
        }

        // Passwort aktualisieren
        user.password = newPassword;
        await user.save();

        // Erfolg loggen
        await logPasswordChange(userId, true, req);

        res.json({ message: 'Passwort erfolgreich geändert' });
    } catch (error) {
        logger.error('Error changing password', { error: error.message, userId: req.user.id });
        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
};

// Admin-User erstellen (nur für initiale Setup)
exports.setupAdmin = async (req, res) => {
    try {
        // Prüfen, ob bereits Admin existiert
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin-Benutzer existiert bereits' });
        }

        // Prüfen, ob der Benutzername eindeutig ist
        const uniqueCheck = await User.checkUnique('admin');
        if (!uniqueCheck.isValid) {
            return res.status(400).json({ message: uniqueCheck.message });
        }

        // Sicheres Zufallspasswort generieren
        const tempPassword = crypto.randomBytes(8).toString('hex');

        // Admin erstellen
        const admin = new User({
            username: 'admin',
            password: tempPassword,
            role: 'admin'
        });

        await admin.save();

        // Admin-Erstellung loggen
        await logAdminAction(
            admin._id,
            'CREATED_INITIAL_ADMIN',
            'User',
            { username: 'admin' },
            req
        );

        logger.info('Admin user created', { adminId: admin._id });

        res.status(201).json({
            message: 'Admin-Benutzer erfolgreich erstellt',
            initialPassword: tempPassword,
            note: 'Bitte ändern Sie dieses Passwort sofort nach der ersten Anmeldung'
        });
    } catch (error) {
        logger.error('Error creating admin user', { error: error.message });

        // Detailliertere Fehlerbehandlung
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                message: 'Validierungsfehler',
                errors
            });
        }

        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
};

// Logout (optional - hauptsächlich für Audit-Logging)
exports.logout = async (req, res) => {
    try {
        const userId = req.user.id;

        // Logout loggen
        await dbAuditLog(
            userId,
            'LOGOUT',
            { username: req.user.username },
            req
        );

        res.json({ message: 'Erfolgreich abgemeldet' });
    } catch (error) {
        logger.error('Error during logout', { error: error.message });
        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
};

// Token validieren (optional)
exports.validateToken = async (req, res) => {
    try {
        // Wenn die Anfrage hier ankommt, ist der Token bereits durch authMiddleware validiert
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        res.json({
            valid: true,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        logger.error('Error validating token', { error: error.message });
        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
};

// Benutzer erstellen (für Admins)
exports.createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Validierung
        if (!username || !password) {
            return res.status(400).json({
                message: 'Benutzername und Passwort sind erforderlich'
            });
        }

        // Prüfen, ob Benutzername eindeutig ist
        const uniqueCheck = await User.checkUnique(username);
        if (!uniqueCheck.isValid) {
            return res.status(400).json({ message: uniqueCheck.message });
        }

        // Neuen Benutzer erstellen
        const newUser = new User({
            username,
            password,
            role: role || 'user'
        });

        await newUser.save();

        // Aktion loggen
        await logAdminAction(
            req.user.id,
            'CREATED_USER',
            'User',
            {
                newUserId: newUser._id,
                newUsername: username,
                newUserRole: newUser.role
            },
            req
        );

        res.status(201).json({
            message: 'Benutzer erfolgreich erstellt',
            user: {
                id: newUser._id,
                username: newUser.username,
                role: newUser.role
            }
        });
    } catch (error) {
        logger.error('Error creating user', { error: error.message });

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                message: 'Validierungsfehler',
                errors
            });
        }

        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
};

// Alle Benutzer abrufen (für Admins)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });

        // Aktion loggen
        await logAdminAction(
            req.user.id,
            'VIEWED_ALL_USERS',
            'User',
            { count: users.length },
            req
        );

        res.json(users);
    } catch (error) {
        logger.error('Error fetching users', { error: error.message });
        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
};

// Benutzer aktivieren/deaktivieren (für Admins)
exports.toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        // Admin kann sich nicht selbst deaktivieren
        if (user._id.toString() === req.user.id) {
            return res.status(400).json({
                message: 'Sie können Ihren eigenen Account nicht deaktivieren'
            });
        }

        user.active = !user.active;
        await user.save();

        // Aktion loggen
        await logAdminAction(
            req.user.id,
            user.active ? 'ACTIVATED_USER' : 'DEACTIVATED_USER',
            'User',
            {
                targetUserId: user._id,
                targetUsername: user.username
            },
            req
        );

        res.json({
            message: `Benutzer ${user.active ? 'aktiviert' : 'deaktiviert'}`,
            user: {
                id: user._id,
                username: user.username,
                active: user.active
            }
        });
    } catch (error) {
        logger.error('Error toggling user status', { error: error.message });
        res.status(500).json({ message: 'Serverfehler aufgetreten' });
    }
};