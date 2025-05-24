const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    title: String,
    imagePath: String,
    createdAt: { type: Date, default: Date.now },
    ipAddress: String,
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' }
});

module.exports = mongoose.model('Image', imageSchema);