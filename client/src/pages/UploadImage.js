import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const UploadImage = () => {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

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

        console.log('Datei zum Hochladen ausgewählt:', file.name, file.type, file.size);

        try {
            const response = await axios.post('http://localhost:5000/api/images/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            console.log('Server-Antwort:', response.data);
            navigate(`/create/${response.data._id}`);
        } catch (err) {
            console.error('Upload-Fehler:', err);
            setError(err.response?.data?.message || 'Fehler beim Hochladen des Bildes');
            setLoading(false);
        }
    };

    return (
        <div className="upload-container">
            <h2>Bild hochladen</h2>

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

                <button type="submit" disabled={loading}>
                    {loading ? 'Wird hochgeladen...' : 'Hochladen'}
                </button>
            </form>
        </div>
    );
};

export default UploadImage;