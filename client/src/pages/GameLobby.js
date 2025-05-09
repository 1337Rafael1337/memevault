import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const GameLobby = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
    const [timeLeft, setTimeLeft] = useState(0);

    // Spiel-Details laden
    useEffect(() => {
        const fetchGame = async () => {
            try {
                const response = await axios.get(`/api/games/${gameId}`);
                setGame(response.data);
                setLoading(false);

                // Timer berechnen
                if (response.data.phaseEndTime) {
                    const endTime = new Date(response.data.phaseEndTime);
                    const now = new Date();
                    setTimeLeft(Math.max(0, Math.floor((endTime - now) / 1000)));
                }
            } catch (err) {
                setError('Fehler beim Laden des Spiels');
                setLoading(false);
            }
        };

        fetchGame();
        const interval = setInterval(fetchGame, 5000); // Alle 5 Sekunden aktualisieren

        return () => clearInterval(interval);
    }, [gameId]);

    // Timer
    useEffect(() => {
        if (timeLeft <= 0) return;

        const timerInterval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [timeLeft]);

    // Phase wechseln (nur für den Ersteller)
    const handleNextPhase = async () => {
        try {
            const response = await axios.post(`/api/games/${gameId}/next-phase`);
            setGame(response.data);
        } catch (err) {
            setError('Fehler beim Phasenwechsel');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const renderPhaseContent = () => {
        if (!game) return null;

        switch (game.status) {
            case 'collecting':
                return (
                    <div className="phase-content">
                        <h3>Phase 1: Bilder sammeln</h3>
                        <p>Lade Bilder hoch, die als Grundlage für Memes dienen sollen.</p>
                        <button
                            onClick={() => navigate(`/game/${gameId}/upload`)}
                            className="btn btn-primary"
                        >
                            Bild hochladen
                        </button>
                    </div>
                );
            case 'creating':
                return (
                    <div className="phase-content">
                        <h3>Phase 2: Memes erstellen</h3>
                        <p>Erstelle Memes aus den hochgeladenen Bildern.</p>
                        <button
                            onClick={() => navigate(`/game/${gameId}/create-meme`)}
                            className="btn btn-primary"
                        >
                            Meme erstellen
                        </button>
                    </div>
                );
            case 'voting':
                return (
                    <div className="phase-content">
                        <h3>Phase 3: Abstimmen</h3>
                        <p>Stimme für die besten Memes ab.</p>
                        <button
                            onClick={() => navigate(`/game/${gameId}/vote`)}
                            className="btn btn-primary"
                        >
                            Abstimmen
                        </button>
                    </div>
                );
            case 'completed':
                return (
                    <div className="phase-content">
                        <h3>Spiel beendet</h3>
                        <p>Das Spiel ist abgeschlossen. Hier sind die Ergebnisse:</p>
                        <button
                            onClick={() => navigate(`/game/${gameId}/results`)}
                            className="btn btn-primary"
                        >
                            Ergebnisse anzeigen
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) return <div>Lade Spiel...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!game) return <div>Spiel nicht gefunden</div>;

    return (
        <div className="game-lobby">
            <h2>{game.name}</h2>

            <div className="game-info">
                <p><strong>Spiel-Code:</strong> {game.code}</p>
                <p><strong>Ersteller:</strong> {game.creator}</p>
                <p><strong>Status:</strong> {
                    game.status === 'collecting' ? 'Bilder sammeln' :
                        game.status === 'creating' ? 'Memes erstellen' :
                            game.status === 'voting' ? 'Abstimmen' : 'Abgeschlossen'
                }</p>
                <p><strong>Zeit übrig:</strong> {formatTime(timeLeft)}</p>
            </div>

            <div className="participants">
                <h3>Teilnehmer ({game.participants.length})</h3>
                <ul>
                    {game.participants.map((participant, index) => (
                        <li key={index}>{participant}</li>
                    ))}
                </ul>
            </div>

            {renderPhaseContent()}

            {playerName === game.creator && game.status !== 'completed' && (
                <div className="admin-controls">
                    <button
                        onClick={handleNextPhase}
                        className="btn"
                    >
                        Nächste Phase starten
                    </button>
                </div>
            )}
        </div>
    );
};

export default GameLobby;