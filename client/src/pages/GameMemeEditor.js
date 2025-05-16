import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const GameMemeEditor = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [images, setImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [topText, setTopText] = useState('');
    const [bottomText, setBottomText] = useState('');
    const [fontType, setFontType] = useState('Impact');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const canvasRef = useRef(null);
    const playerName = localStorage.getItem('playerName') || '';

    // Spiel und Bilder laden
    useEffect(() => {
        const fetchGameAndImages = async () => {
            try {
                // Spiel laden
                const gameResponse = await axios.get(`/api/games/${gameId}`);
                setGame(gameResponse.data);

                // Überprüfen, ob die Phase richtig ist
                if (gameResponse.data.status !== 'creating') {
                    setError('In dieser Phase können keine Memes mehr erstellt werden');
                    setLoading(false);
                    return;
                }

                // Bilder laden
                const imagesResponse = await axios.get(`/api/games/${gameId}/images`);
                setImages(imagesResponse.data);

                if (imagesResponse.data.length > 0) {
                    setSelectedImage(imagesResponse.data[0]);
                }

                setLoading(false);
            } catch (err) {
                setError('Fehler beim Laden der Spieldaten');
                setLoading(false);
            }
        };

        fetchGameAndImages();
    }, [gameId]);

    // Meme auf Canvas rendern
    useEffect(() => {
        if (!selectedImage) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Canvas-Größe an Bild anpassen
            canvas.width = img.width;
            canvas.height = img.height;

            // Bild zeichnen
            ctx.drawImage(img, 0, 0);

            // Text-Stil konfigurieren
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.textAlign = 'center';
            ctx.font = `bold 36px ${fontType}`;

            // Oberen Text zeichnen
            if (topText) {
                ctx.fillText(topText, canvas.width / 2, 50);
                ctx.strokeText(topText, canvas.width / 2, 50);
            }

            // Unteren Text zeichnen
            if (bottomText) {
                ctx.fillText(bottomText, canvas.width / 2, canvas.height - 20);
                ctx.strokeText(bottomText, canvas.width / 2, canvas.height - 20);
            }
        };

        img.src = `/uploads/${selectedImage.imagePath}`;
    }, [selectedImage, topText, bottomText, fontType]);

    const handleImageSelect = (image) => {
        setSelectedImage(image);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedImage) {
            setError('Bitte wähle ein Bild aus');
            return;
        }

        try {
            const memeData = {
                imageId: selectedImage._id,
                topText,
                bottomText,
                fontType,
                creator: playerName
            };

            await axios.post(`/api/games/${gameId}/memes/create`, memeData);

            // Zurück zur Spiellobby
            navigate(`/game/${gameId}`);
        } catch (err) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Fehler beim Erstellen des Memes');
            }
        }
    };

    if (loading) return <div>Lade Spiel...</div>;
    if (!game) return <div>Spiel nicht gefunden</div>;

    return (
        <div className="game-meme-editor">
            <h2>Meme für "{game.name}" erstellen</h2>

            {game.status !== 'creating' ? (
                <div className="error-message">
                    In dieser Phase können keine Memes mehr erstellt werden.
                    <br />
                    <button onClick={() => navigate(`/game/${gameId}`)}>
                        Zurück zur Spiellobby
                    </button>
                </div>
            ) : (
                <div className="editor-container">
                    <div className="image-selection">
                        <h3>Wähle ein Bild:</h3>
                        <div className="image-grid">
                            {images.length > 0 ? (
                                images.map(image => (
                                    <div
                                        key={image._id}
                                        className={`image-item ${selectedImage?._id === image._id ? 'selected' : ''}`}
                                        onClick={() => handleImageSelect(image)}
                                    >
                                        <img
                                            src={`/uploads/${image.imagePath}`}
                                            alt={image.title || 'Bild'}
                                        />
                                    </div>
                                ))
                            ) : (
                                <p>Keine Bilder verfügbar. Warte bis jemand Bilder hochlädt.</p>
                            )}
                        </div>
                    </div>

                    {selectedImage && (
                        <>
                            <div className="canvas-container">
                                <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label htmlFor="topText">Oberer Text:</label>
                                    <input
                                        type="text"
                                        id="topText"
                                        value={topText}
                                        onChange={(e) => setTopText(e.target.value)}
                                        placeholder="Oberer Text"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="bottomText">Unterer Text:</label>
                                    <input
                                        type="text"
                                        id="bottomText"
                                        value={bottomText}
                                        onChange={(e) => setBottomText(e.target.value)}
                                        placeholder="Unterer Text"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="fontType">Schriftart:</label>
                                    <select
                                        id="fontType"
                                        value={fontType}
                                        onChange={(e) => setFontType(e.target.value)}
                                    >
                                        <option value="Impact">Impact</option>
                                        <option value="Arial">Arial</option>
                                        <option value="Comic Sans MS">Comic Sans MS</option>
                                    </select>
                                </div>

                                {error && <div className="error-message">{error}</div>}

                                <div className="button-group">
                                    <button type="submit" disabled={!selectedImage || game.status !== 'creating'}>
                                        Meme speichern
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => navigate(`/game/${gameId}`)}
                                        className="secondary-button"
                                    >
                                        Zurück zur Lobby
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default GameMemeEditor;