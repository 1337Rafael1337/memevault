// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import CreateGame from './pages/CreateGame';
import JoinGame from './pages/JoinGame';
import GameLobby from './pages/GameLobby';
import GameImageUpload from './pages/GameImageUpload';
import GameMemeEditor from './pages/GameMemeEditor';
import GameVoting from './pages/GameVoting';
import GameResults from './pages/GameResults';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
    return (
        <Router>
            <div className="App">
                <Header />
                <main className="container">
                    <Routes>
                        {/* Hauptseite */}
                        <Route path="/" element={<Home />} />

                        {/* Spiel-Routen */}
                        <Route path="/games/create" element={<CreateGame />} />
                        <Route path="/games/join" element={<JoinGame />} />
                        <Route path="/game/:gameId" element={<GameLobby />} />
                        <Route path="/game/:gameId/upload" element={<GameImageUpload />} />
                        <Route path="/game/:gameId/create-meme" element={<GameMemeEditor />} />
                        <Route path="/game/:gameId/vote" element={<GameVoting />} />
                        <Route path="/game/:gameId/results" element={<GameResults />} />

                        {/* Admin-Route */}
                        <Route path="/admin" element={<AdminDashboard />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;