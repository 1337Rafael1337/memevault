import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const GameImageUpload = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [gameLoading, setGameLoading] = useState(true);
    const [error, setError] = useState('');

    // Spiel-Details laden
    useEffect(() => {
        const fetchGame = async () => {
            try {
                const response = await axios.get(`/api/games/${gameId}`);
                setGame(response.data);
                setGameLoading(false);

                // Überprüfen, ob die Phase richtig ist
                if (response.data.status !== 'collecting') {
                    setError('In dieser Phase können keine Bilder mehr hochgeladen werden');
                }
            } catch (err) {
                setError('Fehler beim Laden des Spiels');
                setGameLoading(false);
            }
        };

        fetchGame();
    }, [gameId]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];

        if (selectedFile) {
            setFile(selectedFile);

            // Bild-Vorschau erstellen
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            setError('Bitte wähle ein Bild aus');
            return;
        }

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('image', file);
        formData.append('title', title);

        try {
            await axios.post(`/api/games/${gameId}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Zurück zur Spiellobby
            navigate(`/game/${gameId}`);
        } catch (err) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Fehler beim Hochladen des Bildes');
            }
            setLoading(false);
        }
    };

    if (gameLoading) return <div>Lade Spiel...</div>;
    if (!game) return <div>Spiel nicht gefunden</div>;

    return (
        <div className="game-image-upload">
            <h2>Bild für "{game.name}" hochladen</h2>

            {game.status !== 'collecting' ? (
                <div className="error-message">
                    In dieser Phase können keine Bilder mehr hochgeladen werden.
                    <br />
                    <button onClick={() => navigate(`/game/${gameId}`)}>
                        Zurück zur Spiellobby
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="title">Titel (optional):</label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Gib einen Titel ein"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="image">Bild auswählen:</label>
                        <input
                            type="file"
                            id="image"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {preview && (
                        <div className="image-preview">
                            <h3>Vorschau:</h3>
                            <img src={preview} alt="Vorschau" style={{ maxWidth: '100%', maxHeight: '300px' }} />
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    <div className="button-group">
                        <button type="submit" disabled={loading || game.status !== 'collecting'}>
                            {loading ? 'Wird hochgeladen...' : 'Hochladen'}
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
            )}
        </div>
    );
};

export default GameImageUpload;