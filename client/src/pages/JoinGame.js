import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const JoinGame = () => {
    const [gameCode, setGameCode] = useState('');
    const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!gameCode) {
            setError('Bitte gib einen Spiel-Code ein');
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

            // Spiel beitreten
            const response = await axios.post('/api/games/join', {
                code: gameCode,
                playerName
            });

            // Zur Spiellobby navigieren
            navigate(`/game/${response.data._id}`);
        } catch (err) {
            if (err.response?.status === 404) {
                setError('Spiel nicht gefunden. Überprüfe den Code.');
            } else if (err.response?.status === 400) {
                setError(err.response.data.message);
            } else {
                setError('Fehler beim Beitreten zum Spiel');
            }
            setLoading(false);
        }
    };

    return (
        <div className="join-game">
            <h2>Einem Meme-Spiel beitreten</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="gameCode">Spiel-Code:</label>
                    <input
                        type="text"
                        id="gameCode"
                        value={gameCode}
                        onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                        placeholder="z.B. ABC123"
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
                    {loading ? 'Wird beigetreten...' : 'Spiel beitreten'}
                </button>
            </form>
        </div>
    );
};

export default JoinGame;