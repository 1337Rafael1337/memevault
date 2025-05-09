const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

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

const Image = mongoose.model('Image', imageSchema);
const Meme = mongoose.model('Meme', memeSchema);
const Vote = mongoose.model('Vote', voteSchema);
const Game = mongoose.model('Game', gameSchema);

// Routen

// ===== ORIGINAL MEME-ROUTEN =====

// Bild hochladen
app.post('/api/images/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Kein Bild hochgeladen' });
        }

        const newImage = new Image({
            title: req.body.title || 'Unbenannt',
            imagePath: req.file.filename,
            ipAddress: req.ip
        });

        await newImage.save();
        res.status(201).json(newImage);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Alle Bilder abrufen
app.get('/api/images', async (req, res) => {
    try {
        const images = await Image.find({ gameId: { $exists: false } }).sort({ createdAt: -1 });
        res.json(images);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Einzelnes Bild abrufen
app.get('/api/images/:id', async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        if (!image) {
            return res.status(404).json({ message: 'Bild nicht gefunden' });
        }
        res.json(image);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Meme erstellen
app.post('/api/memes/create', async (req, res) => {
    try {
        const { imageId, topText, bottomText, fontType } = req.body;

        const newMeme = new Meme({
            imageId,
            topText,
            bottomText,
            fontType,
            ipAddress: req.ip
        });

        await newMeme.save();
        res.status(201).json(newMeme);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Alle Memes abrufen
app.get('/api/memes', async (req, res) => {
    try {
        const memes = await Meme.find({ gameId: { $exists: false } }).populate('imageId').sort({ createdAt: -1 });
        res.json(memes);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Einzelnes Meme abrufen
app.get('/api/memes/:id', async (req, res) => {
    try {
        const meme = await Meme.findById(req.params.id).populate('imageId');
        if (!meme) {
            return res.status(404).json({ message: 'Meme nicht gefunden' });
        }
        res.json(meme);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Für ein Meme abstimmen
app.post('/api/votes/:memeId', async (req, res) => {
    try {
        const { voteType } = req.body;
        const { memeId } = req.params;

        // Prüfen, ob der Nutzer bereits abgestimmt hat
        const existingVote = await Vote.findOne({
            memeId,
            ipAddress: req.ip,
            gameId: { $exists: false }
        });

        if (existingVote) {
            return res.status(400).json({ message: 'Du hast bereits abgestimmt' });
        }

        const newVote = new Vote({
            memeId,
            voteType,
            ipAddress: req.ip
        });

        await newVote.save();
        res.status(201).json(newVote);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Abstimmungsergebnisse für ein Meme abrufen
app.get('/api/votes/:memeId', async (req, res) => {
    try {
        const { memeId } = req.params;

        const votes = await Vote.find({
            memeId,
            gameId: { $exists: false }
        });
        const upvotes = votes.filter(vote => vote.voteType === true).length;
        const downvotes = votes.filter(vote => vote.voteType === false).length;

        res.json({ upvotes, downvotes, total: votes.length });
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Trending Memes abrufen
app.get('/api/memes/trending', async (req, res) => {
    try {
        const memes = await Meme.find({ gameId: { $exists: false } }).populate('imageId');
        const memeIds = memes.map(meme => meme._id);

        // Votes für alle Memes abrufen
        const voteResults = await Promise.all(
            memeIds.map(async (id) => {
                const votes = await Vote.find({
                    memeId: id,
                    gameId: { $exists: false }
                });
                const upvotes = votes.filter(vote => vote.voteType === true).length;
                const downvotes = votes.filter(vote => vote.voteType === false).length;
                return {
                    memeId: id,
                    score: upvotes - downvotes,
                    total: votes.length
                };
            })
        );

        // Nach Score sortieren
        voteResults.sort((a, b) => b.score - a.score);

        // Die Top-Memes abrufen
        const topMemeIds = voteResults.slice(0, 10).map(result => result.memeId);
        const topMemes = await Meme.find({ _id: { $in: topMemeIds } }).populate('imageId');

        // Sortieren gemäß der berechneten Scores
        const sortedMemes = topMemeIds.map(id =>
            topMemes.find(meme => meme._id.toString() === id.toString())
        ).filter(Boolean);

        res.json(sortedMemes);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// ===== NEUE SPIEL-ROUTEN =====

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

// Upload-Ordner erstellen, falls er nicht existiert
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});