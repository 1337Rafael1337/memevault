const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
    memeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meme' },
    voteType: Boolean,
    createdAt: { type: Date, default: Date.now },
    ipAddress: String,
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    voter: String
});

module.exports = mongoose.model('Vote', voteSchema);