// src/components/Header.js
import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header className="header">
            <div className="container">
                <h1>MemeVault</h1>
                <nav>
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/games/create">Spiel erstellen</Link></li>
                        <li><Link to="/games/join">Spiel beitreten</Link></li>
                        <li><Link to="/admin">Admin</Link></li>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header;