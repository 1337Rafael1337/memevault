const Game = require('../models/Game');
const Image = require('../models/Image');
const Meme = require('../models/Meme');
const Vote = require('../models/Vote');
const logger = require('../utils/logger');

// Spiel erstellen
exports.createGame = async (req, res) => {
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
        logger.error('Error creating game:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

// Spiel beitreten
exports.joinGame = async (req, res) => {
    try {
        const { code, playerName } = req.body;

        const game = await Game.findOne({ code: code.toUpperCase() });
        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }

        if (game.status !== 'collecting') {
            return res.status(400).json({ message: 'Diesem Spiel kann nicht mehr beigetreten werden' });
        }

        if (!game.participants.includes(playerName)) {
            game.participants.push(playerName);
            await game.save();
        }

        res.json(game);
    } catch (error) {
        logger.error('Error joining game:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

// Alle Spiele abrufen
exports.getAllGames = async (req, res) => {
    try {
        const games = await Game.find().sort({ createdAt: -1 });
        res.json(games);
    } catch (error) {
        logger.error('Error fetching games:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

// Spiel-Details abrufen
exports.getGameById = async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ message: 'Spiel nicht gefunden' });
        }
        res.json(game);
    } catch (error) {
        logger.error('Error fetching game:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

// Phase wechseln
exports.nextPhase = async (req, res) => {
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
            default:
                return res.status(400).json({ message: 'Spiel ist bereits abgeschlossen' });
        }

        // Neue Zeitbegrenzung
        game.phaseEndTime = new Date(Date.now() + 10 * 60 * 1000);

        await game.save();
        res.json(game);
    } catch (error) {
        logger.error('Error changing phase:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

// Bild hochladen
exports.uploadImage = async (req, res) => {
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
        logger.error('Error uploading image:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

// Bilder für ein Spiel abrufen
exports.getGameImages = async (req, res) => {
    try {
        const images = await Image.find({ gameId: req.params.gameId }).sort({ createdAt: -1 });
        res.json(images);
    } catch (error) {
        logger.error('Error fetching images:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

// Meme erstellen
exports.createMeme = async (req, res) => {
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
        logger.error('Error creating meme:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

// Memes für ein Spiel abrufen
exports.getGameMemes = async (req, res) => {
    try {
        const memes = await Meme.find({ gameId: req.params.gameId })
            .populate('imageId')
            .sort({ createdAt: -1 });
        res.json(memes);
    } catch (error) {
        logger.error('Error fetching memes:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

// Für Meme abstimmen
exports.voteMeme = async (req, res) => {
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
        logger.error('Error voting:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

// Ergebnisse abrufen
exports.getResults = async (req, res) => {
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
        logger.error('Error fetching results:', error);
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};