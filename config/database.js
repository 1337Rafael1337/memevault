const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/memevault');
        logger.info('Mit MongoDB verbunden');
    } catch (error) {
        logger.error('MongoDB Verbindungsfehler:', error);
        process.exit(1);
    }
};

module.exports = { connectDatabase };