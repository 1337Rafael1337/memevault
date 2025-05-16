// src/pages/Home.js
import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="home">
            <div className="welcome-section">
                <h2>Willkommen bei MemeVault</h2>
                <p>Die ultimative Meme-Party-Plattform für dich und deine Freunde!</p>
            </div>

            <div className="action-cards">
                <div className="action-card">
                    <h3>Neues Spiel erstellen</h3>
                    <p>Starte ein neues Meme-Spiel und lade deine Freunde ein.</p>
                    <Link to="/games/create" className="btn btn-primary">Spiel erstellen</Link>
                </div>

                <div className="action-card">
                    <h3>Einem Spiel beitreten</h3>
                    <p>Tritt einem bestehenden Spiel mit einem Code bei.</p>
                    <Link to="/games/join" className="btn btn-primary">Spiel beitreten</Link>
                </div>
            </div>

            <div className="how-to-play">
                <h3>So funktioniert's:</h3>
                <ol>
                    <li>
                        <strong>Spiel erstellen oder beitreten</strong>
                        <p>Starte ein neues Spiel oder tritt einem bestehenden bei.</p>
                    </li>
                    <li>
                        <strong>Phase 1: Bilder sammeln</strong>
                        <p>Alle Spieler laden lustige Bilder hoch, die als Grundlage für Memes dienen.</p>
                    </li>
                    <li>
                        <strong>Phase 2: Memes erstellen</strong>
                        <p>Aus den hochgeladenen Bildern erstellt jeder Spieler witzige Memes.</p>
                    </li>
                    <li>
                        <strong>Phase 3: Abstimmen</strong>
                        <p>Alle stimmen für ihre Lieblings-Memes ab. Wer die meisten Stimmen bekommt, gewinnt!</p>
                    </li>
                </ol>
            </div>
        </div>
    );
};

export default Home;