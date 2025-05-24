const mongoose = require('mongoose');

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
    participants: [String],
    createdAt: { type: Date, default: Date.now },
    phaseEndTime: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) }
});

module.exports = mongoose.model('Game', gameSchema);