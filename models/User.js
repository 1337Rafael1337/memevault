const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

// Eigene Validierungsmethode für eindeutige Felder
userSchema.pre('save', async function (next) {
    // Nur prüfen, wenn Benutzername geändert wurde
    if (this.isModified('username')) {
        const existingUser = await this.constructor.findOne({
            username: this.username,
            _id: { $ne: this._id } // Eigenen Datensatz ausschließen bei Updates
        });

        if (existingUser) {
            const err = new Error('Benutzername existiert bereits');
            err.name = 'ValidationError';
            err.errors = { username: { message: 'Benutzername existiert bereits' } };
            return next(err);
        }
    }
    next();
});

// Statische Methode zur Validierung von eindeutigen Feldern bei neuen Dokumenten
userSchema.statics.checkUnique = async function (username) {
    const existingUser = await this.findOne({ username });
    if (existingUser) {
        return {
            isValid: false,
            message: 'Benutzername existiert bereits'
        };
    }
    return { isValid: true };
};

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

module.exports = mongoose.model('User', userSchema);