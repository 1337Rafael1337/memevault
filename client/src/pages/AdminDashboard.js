import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/games');
            setGames(response.data);
            setLoading(false);
        } catch (err) {
            setError('Fehler beim Laden der Spiele');
            setLoading(false);
        }
    };

    const handleStatusChange = async (gameId, status) => {
        try {
            await axios.post(`/api/admin/games/${gameId}/change-status`, { status });
            fetchGames(); // Spiele neu laden
        } catch (err) {
            setError('Fehler beim Ändern des Status');
        }
    };

    const handleDeleteGame = async (gameId) => {
        if (!window.confirm('Möchtest du dieses Spiel wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            return;
        }

        try {
            await axios.delete(`/api/admin/games/${gameId}`);
            fetchGames(); // Spiele neu laden
        } catch (err) {
            setError('Fehler beim Löschen des Spiels');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'collecting': return 'Bilder sammeln';
            case 'creating': return 'Memes erstellen';
            case 'voting': return 'Abstimmen';
            case 'completed': return 'Abgeschlossen';
            default: return status;
        }
    };

    if (loading) return <div>Lade Spiele...</div>;

    return (
        <div className="admin-dashboard">
            <h2>Admin-Dashboard</h2>

            {error && <div className="error-message">{error}</div>}

            <div className="admin-controls">
                <button onClick={fetchGames} className="refresh-button">
                    Aktualisieren
                </button>
            </div>

            <div className="games-list">
                <h3>Alle Spiele ({games.length})</h3>

                {games.length === 0 ? (
                    <p>Keine Spiele vorhanden.</p>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Code</th>
                                <th>Ersteller</th>
                                <th>Status</th>
                                <th>Erstellt am</th>
                                <th>Teilnehmer</th>
                                <th>Bilder</th>
                                <th>Memes</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {games.map(game => (
                                <tr key={game._id}>
                                    <td>{game.name}</td>
                                    <td>{game.code}</td>
                                    <td>{game.creator}</td>
                                    <td>{getStatusLabel(game.status)}</td>
                                    <td>{formatDate(game.createdAt)}</td>
                                    <td>{game.participants.length}</td>
                                    <td>{game.stats.imageCount}</td>
                                    <td>{game.stats.memeCount}</td>
                                    <td className="actions-cell">
                                        <button
                                            onClick={() => navigate(`/game/${game._id}`)}
                                            className="action-button view-button"
                                        >
                                            Ansehen
                                        </button>

                                        <div className="status-controls">
                                            <select
                                                defaultValue={game.status}
                                                onChange={(e) => handleStatusChange(game._id, e.target.value)}
                                            >
                                                <option value="collecting">Bilder sammeln</option>
                                                <option value="creating">Memes erstellen</option>
                                                <option value="voting">Abstimmen</option>
                                                <option value="completed">Abgeschlossen</option>
                                            </select>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteGame(game._id)}
                                            className="action-button delete-button"
                                        >
                                            Löschen
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;