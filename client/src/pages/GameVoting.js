import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const GameVoting = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [memes, setMemes] = useState([]);
    const [votedMemes, setVotedMemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const playerName = localStorage.getItem('playerName') || '';

    // Spiel und Memes laden
    useEffect(() => {
        const fetchGameAndMemes = async () => {
            try {
                // Spiel laden
                const gameResponse = await axios.get(`/api/games/${gameId}`);
                setGame(gameResponse.data);

                // Überprüfen, ob die Phase richtig ist
                if (gameResponse.data.status !== 'voting') {
                    setError('In dieser Phase kann nicht abgestimmt werden');
                    setLoading(false);
                    return;
                }

                // Memes laden
                const memesResponse = await axios.get(`/api/games/${gameId}/memes`);
                setMemes(memesResponse.data);

                // Lokal gespeicherte Votes laden
                const voted = JSON.parse(localStorage.getItem(`game_${gameId}_votes`) || '[]');
                setVotedMemes(voted);

                setLoading(false);
            } catch (err) {
                setError('Fehler beim Laden der Spieldaten');
                setLoading(false);
            }
        };

        fetchGameAndMemes();
    }, [gameId]);

    const handleVote = async (memeId) => {
        try {
            await axios.post(`/api/games/${gameId}/memes/${memeId}/vote`, {
                voter: playerName
            });

            // Lokal speichern
            const updatedVotes = [...votedMemes, memeId];
            setVotedMemes(updatedVotes);
            localStorage.setItem(`game_${gameId}_votes`, JSON.stringify(updatedVotes));

            // Optional: UI aktualisieren, um anzuzeigen, dass der Nutzer abgestimmt hat
        } catch (err) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Fehler bei der Abstimmung');
            }
        }
    };

    if (loading) return <div>Lade Spiel...</div>;
    if (!game) return <div>Spiel nicht gefunden</div>;

    return (
        <div className="game-voting">
            <h2>Abstimmung für "{game.name}"</h2>

            {game.status !== 'voting' ? (
                <div className="error-message">
                    In dieser Phase kann nicht abgestimmt werden.
                    <br />
                    <button onClick={() => navigate(`/game/${gameId}`)}>
                        Zurück zur Spiellobby
                    </button>
                </div>
            ) : (
                <>
                    <p className="instructions">
                        Stimme für die besten Memes ab. Du kannst für jedes Meme nur einmal abstimmen.
                    </p>

                    {error && <div className="error-message">{error}</div>}

                    <div className="memes-grid">
                        {memes.length > 0 ? (
                            memes.map(meme => (
                                <div key={meme._id} className="meme-voting-card">
                                    <div className="meme-image">
                                        <img
                                            src={`/uploads/${meme.imageId.imagePath}`}
                                            alt={meme.imageId.title || 'Meme'}
                                        />
                                        <div className="meme-text-overlay">
                                            <div className="top-text">{meme.topText}</div>
                                            <div className="bottom-text">{meme.bottomText}</div>
                                        </div>
                                    </div>

                                    <div className="meme-info">
                                        <p className="creator">Erstellt von: {meme.creator}</p>

                                        {votedMemes.includes(meme._id) ? (
                                            <button className="voted-button" disabled>
                                                Abgestimmt ✓
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleVote(meme._id)}
                                                className="vote-button"
                                            >
                                                Für dieses Meme stimmen
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p>Keine Memes verfügbar. Warte bis jemand Memes erstellt.</p>
                        )}
                    </div>

                    <div className="back-link">
                        <button
                            onClick={() => navigate(`/game/${gameId}`)}
                            className="secondary-button"
                        >
                            Zurück zur Lobby
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default GameVoting;