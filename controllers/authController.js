const User = require('../models/User');
const { generateToken } = require('../utils/auth');
const { logger, dbAuditLog } = require('../utils/logger');

// Generische Fehlermeldung für Login
const GENERIC_AUTH_ERROR = 'Invalid credentials';

// Login-Controller
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validierung
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
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
            return res.status(401).json({ message: GENERIC_AUTH_ERROR });
        }

        // Passwort prüfen
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            // Login-Versuch loggen
            dbAuditLog(
                user._id,
                'FAILED_LOGIN',
                { reason: 'Invalid password' },
                req
            );

            return res.status(401).json({ message: GENERIC_AUTH_ERROR });
        }

        // Login-Zeit aktualisieren
        user.lastLogin = new Date();
        await user.save();

        // Erfolgreichen Login loggen
        dbAuditLog(
            user._id,
            'LOGIN_SUCCESS',
            { username: user.username },
            req
        );

        // Token generieren und senden
        const token = generateToken(user);
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        logger.error('Login error', { error });
        res.status(500).json({ message: 'Server error occurred' });
    }
};

// Admin-User erstellen (nur für initiale Setup)
exports.createAdmin = async (req, res) => {
    try {
        // Prüfen, ob bereits Admin existiert
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin user already exists' });
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
            message: 'Admin user created successfully',
            initialPassword: tempPassword,
            note: 'Please change this password immediately after first login'
        });
    } catch (error) {
        logger.error('Error creating admin user', { error });
        res.status(500).json({ message: 'Server error occurred' });
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
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: 'New password must be at least 8 characters long'
            });
        }

        // Benutzer finden
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Aktuelles Passwort prüfen
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            // Fehlgeschlagenen Versuch loggen
            dbAuditLog(
                userId,
                'PASSWORD_CHANGE_FAILED',
                { reason: 'Invalid current password' },
                req
            );

            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Passwort aktualisieren
        user.password = newPassword;
        await user.save();

        // Erfolg loggen
        dbAuditLog(
            userId,
            'PASSWORD_CHANGED',
            { username: user.username },
            req
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        logger.error('Error changing password', { error });
        res.status(500).json({ message: 'Server error occurred' });
    }
};