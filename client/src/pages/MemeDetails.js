import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const MemeDetails = () => {
    const { memeId } = useParams();
    const [meme, setMeme] = useState(null);
    const [votes, setVotes] = useState({ upvotes: 0, downvotes: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasVoted, setHasVoted] = useState(false);

    useEffect(() => {
        // Prüfen ob der Nutzer bereits abgestimmt hat
        const checkVoted = localStorage.getItem(`voted_${memeId}`);
        if (checkVoted) {
            setHasVoted(true);
        }

        const fetchMeme = async () => {
            try {
                // Meme laden
                const memeResponse = await axios.get(`http://localhost:5000/api/memes/${memeId}`);
                setMeme(memeResponse.data);

                // Votes laden
                const votesResponse = await axios.get(`http://localhost:5000/api/votes/${memeId}`);
                setVotes(votesResponse.data);

                setLoading(false);
            } catch (err) {
                setError('Fehler beim Laden des Memes');
                setLoading(false);
            }
        };

        fetchMeme();
    }, [memeId]);

    const handleVote = async (voteType) => {
        try {
            await axios.post(`http://localhost:5000/api/votes/${memeId}`, { voteType });

            // Abstimmung in localStorage speichern
            localStorage.setItem(`voted_${memeId}`, 'true');
            setHasVoted(true);

            // Votes neu laden
            const votesResponse = await axios.get(`http://localhost:5000/api/votes/${memeId}`);
            setVotes(votesResponse.data);
        } catch (err) {
            setError('Du hast bereits abgestimmt');
        }
    };

    if (loading) return <div>Lade Meme...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!meme) return <div>Meme nicht gefunden</div>;

    return (
        <div className="meme-details">
            <h2>{meme.imageId.title || 'Meme'}</h2>

            <div className="meme-container">
                <div className="meme-image">
                    <img
                        src={`http://localhost:5000/${meme.imageId.imagePath}`}
                        alt={meme.imageId.title || 'Meme'}
                    />
                    <div className="meme-text-overlay">
                        <div className="top-text">{meme.topText}</div>
                        <div className="bottom-text">{meme.bottomText}</div>
                    </div>
                </div>

                <div className="meme-stats">
                    <p>Erstellt am: {new Date(meme.createdAt).toLocaleDateString()}</p>
                    <p>Bewertung: {votes.upvotes - votes.downvotes}</p>
                    <p>Gesamt-Stimmen: {votes.total}</p>
                </div>

                <div className="voting-section">
                    <h3>Bewerte dieses Meme:</h3>
                    {hasVoted ? (
                        <p>Danke für deine Abstimmung!</p>
                    ) : (
                        <div className="voting-buttons">
                            <button
                                onClick={() => handleVote(true)}
                                className="vote-button upvote"
                            >
                                👍 Gefällt mir
                            </button>
                            <button
                                onClick={() => handleVote(false)}
                                className="vote-button downvote"
                            >
                                👎 Gefällt mir nicht
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemeDetails;