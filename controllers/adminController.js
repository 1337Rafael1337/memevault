const Game = require('../models/Game');
const Image = require('../models/Image');
const Meme = require('../models/Meme');
const Vote = require('../models/Vote');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Alle Spiele mit Details
exports.getAllGamesWithDetails = async (req, res) => {
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

        res.json(gamesWithDetails);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler', error: error.message });
    }
};

