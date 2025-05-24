import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import Header from './components/Header';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Home from './pages/Home';
import CreateGame from './pages/CreateGame';
import JoinGame from './pages/JoinGame';
import GameLobby from './pages/GameLobby';
import GameImageUpload from './pages/GameImageUpload';
import GameMemeEditor from './pages/GameMemeEditor';
import GameVoting from './pages/GameVoting';
import GameResults from './pages/GameResults';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Unauthorized from './pages/Unauthorized';
import SetupAdmin from './pages/SetupAdmin'; // NEU

function App() {
    return (
        <Router>
            <div className="App">
                <Header />
                <Routes>
                    {/* Öffentliche Routen */}
                    <Route path="/" element={<Home />} />
                    <Route path="/create" element={<CreateGame />} />
                    <Route path="/join" element={<JoinGame />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/setup-admin" element={<SetupAdmin />} /> {/* NEU */}
                    <Route path="/unauthorized" element={<Unauthorized />} />

                    {/* Spiel-Routen */}
                    <Route path="/game/:gameId/lobby" element={<GameLobby />} />
                    <Route path="/game/:gameId/upload" element={<GameImageUpload />} />
                    <Route path="/game/:gameId/create-meme" element={<GameMemeEditor />} />
                    <Route path="/game/:gameId/vote" element={<GameVoting />} />
                    <Route path="/game/:gameId/results" element={<GameResults />} />

                    {/* Geschützte Admin-Routen */}
                    <Route
                        path="/admin"
                        element={
                            <PrivateRoute requiredRole="admin">
                                <AdminDashboard />
                            </PrivateRoute>
                        }
                    />

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;