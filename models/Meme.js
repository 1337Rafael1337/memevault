const mongoose = require('mongoose');

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

module.exports = mongoose.model('Meme', memeSchema);