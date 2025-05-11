// src/components/Header.js
import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header className="header">
            <div className="container header-container">
                <Link to="/" className="logo-link">
                    <img src="/memevault-logo.png" alt="MemeVault Logo" className="logo-image" />
                </Link>
                <nav>
                    <ul className="nav-list">
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