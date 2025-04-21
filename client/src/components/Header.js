import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header className="header">
            <div className="container">
                <h1>Meme Generator</h1>
                <nav>
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/upload">Bild hochladen</Link></li>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header;