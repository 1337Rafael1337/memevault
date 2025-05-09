import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const GameResults = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Spiel und Ergebnisse laden
    useEffect(() => {
        const fetchGameAndResults = async () => {
            try {
                // Spiel laden
                const gameResponse = await axios.get(`/api/games/${gameId}`);
                setGame(gameResponse.data);

                // Ergebnisse laden
                const resultsResponse = await axios.get(`/api/games/${gameId}/results`);
                setResults(resultsResponse.data);

                setLoading(false);
            } catch (err) {
                setError('Fehler beim Laden der Ergebnisse');
                setLoading(false);
            }
        };

        fetchGameAndResults();
    }, [gameId]);

    if (loading) return <div>Lade Ergebnisse...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!game) return <div>Spiel nicht gefunden</div>;

    return (
        <div className="game-results">
            <h2>Ergebnisse für "{game.name}"</h2>

            <div className="results-container">
                {results.length > 0 ? (
                    results.map((result, index) => (
                        <div
                            key={result.meme._id}
                            className={`result-card ${index === 0 ? 'winner' : ''}`}
                        >
                            <div className="rank">#{index + 1}</div>

                            <div className="meme-image">
                                <img
                                    src={`/uploads/${result.meme.imageId.imagePath}`}
                                    alt={result.meme.imageId.title || 'Meme'}
                                />
                                <div className="meme-text-overlay">
                                    <div className="top-text">{result.meme.topText}</div>
                                    <div className="bottom-text">{result.meme.bottomText}</div>
                                </div>
                            </div>

                            <div className="result-info">
                                <p className="creator">Erstellt von: {result.meme.creator}</p>
                                <p className="votes">Stimmen: {result.votes}</p>
                            </div>

                            {index === 0 && <div className="winner-badge">🏆 Gewinner!</div>}
                        </div>
                    ))
                ) : (
                    <p>Keine Abstimmungsergebnisse gefunden.</p>
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
        </div>
    );
};

export default GameResults;