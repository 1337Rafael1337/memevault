import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const MemeEditor = () => {
    const { imageId } = useParams();
    const navigate = useNavigate();
    const [image, setImage] = useState(null);
    const [topText, setTopText] = useState('');
    const [bottomText, setBottomText] = useState('');
    const [fontType, setFontType] = useState('Impact');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const canvasRef = useRef(null);

    // Bild laden
    useEffect(() => {
        const fetchImage = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/images/${imageId}`);
                setImage(response.data);
                setLoading(false);
            } catch (err) {
                setError('Fehler beim Laden des Bildes');
                setLoading(false);
            }
        };

        fetchImage();
    }, [imageId]);

    // Meme auf Canvas rendern
    useEffect(() => {
        if (!image) return;

        const canvas = canvasRef.current;
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

        img.src = `http://localhost:5000/${image.imagePath}`;
    }, [image, topText, bottomText, fontType]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const memeData = {
                imageId,
                topText,
                bottomText,
                fontType
            };

            const response = await axios.post('http://localhost:5000/api/memes/create', memeData);
            navigate(`/meme/${response.data._id}`);
        } catch (err) {
            setError('Fehler beim Erstellen des Memes');
        }
    };

    if (loading) return <div>Lade Bild...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="meme-editor">
            <h2>Meme erstellen</h2>

            <div className="editor-container">
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

                    <button type="submit">Meme speichern</button>
                </form>
            </div>
        </div>
    );
};

export default MemeEditor;