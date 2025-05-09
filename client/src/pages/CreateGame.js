import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateGame = () => {
    const [gameName, setGameName] = useState('');
    const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!gameName) {
            setError('Bitte gib einen Spielnamen ein');
            return;
        }

        if (!playerName) {
            setError('Bitte gib deinen Namen ein');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Spielername im localStorage speichern
            localStorage.setItem('playerName', playerName);

            // Spiel erstellen
            const response = await axios.post('/api/games/create', {
                name: gameName,
                creatorName: playerName
            });

            // Zur Spiellobby navigieren
            navigate(`/game/${response.data._id}`);
        } catch (err) {
            setError('Fehler beim Erstellen des Spiels');
            setLoading(false);
        }
    };

    return (
        <div className="create-game">
            <h2>Neues Meme-Spiel erstellen</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="gameName">Spielname:</label>
                    <input
                        type="text"
                        id="gameName"
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        placeholder="z.B. Freitagabend-Memes"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="playerName">Dein Name:</label>
                    <input
                        type="text"
                        id="playerName"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Wie heißt du?"
                    />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" disabled={loading}>
                    {loading ? 'Wird erstellt...' : 'Spiel erstellen'}
                </button>
            </form>
        </div>
    );
};

export default CreateGame;