const router = require('express').Router();
const gameController = require('../controllers/gameController');
const upload = require('../config/multer');

// Spiel-Routen
router.post('/create', gameController.createGame);
router.post('/join', gameController.joinGame);
router.get('/', gameController.getAllGames);
router.get('/:id', gameController.getGameById);
router.post('/:id/next-phase', gameController.nextPhase);

// Bild-Upload Route
router.post('/:gameId/upload', upload.single('image'), gameController.uploadImage);

// Weitere Spiel-spezifische Routen
router.get('/:gameId/images', gameController.getGameImages);
router.post('/:gameId/memes/create', gameController.createMeme);
router.get('/:gameId/memes', gameController.getGameMemes);
router.post('/:gameId/memes/:memeId/vote', gameController.voteMeme);
router.get('/:gameId/results', gameController.getResults);

module.exports = router;