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
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/meme-website')
    .then(() => console.log('Mit MongoDB verbunden'))
    .catch(err => console.error('MongoDB Verbindungsfehler:', err));

// Modelle
const imageSchema = new mongoose.Schema({
    title: String,
    imagePath: String,
    createdAt: { type: Date, default: Date.now },
    ipAddress: String
});

const memeSchema = new mongoose.Schema({
    imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
    topText: String,
    bottomText: String,
    fontType: String,
    createdAt: { type: Date, default: Date.now },
    ipAddress: String
});

const voteSchema = new mongoose.Schema({
    memeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meme' },
    voteType: Boolean, // true für positiv, false für negativ
    createdAt: { type: Date, default: Date.now },
    ipAddress: String
});

const Image = mongoose.model('Image', imageSchema);
const Meme = mongoose.model('Meme', memeSchema);
const Vote = mongoose.model('Vote', voteSchema);

// Routen

// Bild hochladen
app.post('/api/images/upload', upload.single('image'), async (req, res) => {
    try {
        console.log('Upload-Anfrage erhalten');

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
        console.error('Upload-Fehler:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
});

// Alle Bilder abrufen
app.get('/api/images', async (req, res) => {
    try {
        const images = await Image.find().sort({ createdAt: -1 });
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
        const memes = await Meme.find().populate('imageId').sort({ createdAt: -1 });
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
            ipAddress: req.ip
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

        const votes = await Vote.find({ memeId });
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
        const memes = await Meme.find().populate('imageId');
        const memeIds = memes.map(meme => meme._id);

        // Votes für alle Memes abrufen
        const voteResults = await Promise.all(
            memeIds.map(async (id) => {
                const votes = await Vote.find({ memeId: id });
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

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});