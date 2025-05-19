// src/pages/Unauthorized.js
import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
    return (
        <div className="unauthorized-page">
            <h2>Zugriff verweigert</h2>
            <p>Du hast keine Berechtigung, auf diese Seite zuzugreifen.</p>
            <div className="actions">
                <Link to="/" className="btn">Zurück zur Startseite</Link>
            </div>
        </div>
    );
};

export default Unauthorized;