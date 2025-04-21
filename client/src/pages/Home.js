import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
    const [memes, setMemes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMemes = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/memes');
                setMemes(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Fehler beim Laden der Memes', error);
                setLoading(false);
            }
        };

        fetchMemes();
    }, []);

    if (loading) return <div>Lade Memes...</div>;

    return (
        <div className="home">
            <h2>Neueste Memes</h2>

            <div className="memes-grid">
                {memes.length > 0 ? (
                    memes.map(meme => (
                        <div key={meme._id} className="meme-card">
                            <Link to={`/meme/${meme._id}`}>
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
                            </Link>
                        </div>
                    ))
                ) : (
                    <p>Noch keine Memes vorhanden. <Link to="/upload">Erstelle das erste!</Link></p>
                )}
            </div>

            <div className="create-button">
                <Link to="/upload" className="btn btn-primary">Neues Meme erstellen</Link>
            </div>
        </div>
    );
};

export default Home;