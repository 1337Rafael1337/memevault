import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Zielseite nach erfolgreichem Login
    const from = location.state?.from?.pathname || '/admin';

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            setError('Benutzername und Passwort werden benötigt');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/login', {
                username,
                password
            });

            // Token und Benutzerinfo im localStorage speichern
            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Redirect zur vorherigen Seite oder Admin-Dashboard
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Login fehlgeschlagen');
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <h2>Admin Login</h2>

            <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                    <label htmlFor="username">Benutzername:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Passwort:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" disabled={loading}>
                    {loading ? 'Anmeldung...' : 'Anmelden'}
                </button>
            </form>
        </div>
    );
};

export default Login;