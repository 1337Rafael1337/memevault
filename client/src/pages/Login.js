import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/api/auth/login', {
                username,
                password
            });

            // Token und Benutzerinfos speichern
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Axios Default Header setzen
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

            // Zur Admin-Seite weiterleiten
            navigate('/admin');
        } catch (error) {
            setError(error.response?.data?.message || 'Login fehlgeschlagen');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Admin Login</h1>

                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Benutzername</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Admin-Benutzername"
                            className="form-control"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Passwort</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Passwort"
                            className="form-control"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                    >
                        {loading ? 'Anmelden...' : 'Anmelden'}
                    </button>
                </form>

                <div className="login-footer">
                    <hr className="divider" />
                    <p className="setup-text">
                        Noch kein Admin-Account vorhanden?
                    </p>
                    <Link to="/setup-admin" className="setup-link">
                        <button className="btn btn-secondary">
                            Admin-Setup starten
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;