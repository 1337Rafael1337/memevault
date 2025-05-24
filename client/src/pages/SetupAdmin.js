import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SetupAdmin = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('check'); // check, create, login, changePassword
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Admin-Erstellung
    const [initialPassword, setInitialPassword] = useState('');

    // Login
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');

    // Passwort ändern
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Prüfen ob Admin bereits existiert
    useEffect(() => {
        checkAdminExists();
    }, []);

    const checkAdminExists = async () => {
        try {
            // Versuche Setup-Endpoint zu erreichen
            const response = await axios.post('/api/auth/setup-admin');
            // Wenn erfolgreich, existiert noch kein Admin
            setInitialPassword(response.data.initialPassword);
            setStep('create');
            setSuccess('Admin-Account wurde erstellt!');
        } catch (error) {
            if (error.response?.status === 400) {
                // Admin existiert bereits
                setStep('login');
                setError('');
            } else {
                setError('Server nicht erreichbar. Läuft der Backend-Server auf Port 5000?');
            }
        }
    };

    const handleCreateAdmin = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/setup-admin');
            setInitialPassword(response.data.initialPassword);
            setSuccess('Admin-Account erfolgreich erstellt!');
            setStep('login');
            // Auto-fill password
            setPassword(response.data.initialPassword);
        } catch (error) {
            setError(error.response?.data?.message || 'Fehler beim Erstellen des Admin-Accounts');
        }

        setLoading(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/login', {
                username,
                password
            });

            setToken(response.data.token);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            setSuccess('Login erfolgreich!');

            // Bei temporärem Passwort zur Änderung auffordern
            if (initialPassword && password === initialPassword) {
                setStep('changePassword');
            } else {
                // Zur Admin-Seite weiterleiten
                setTimeout(() => {
                    navigate('/admin');
                }, 1500);
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Login fehlgeschlagen');
        }

        setLoading(false);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError('Die Passwörter stimmen nicht überein');
            return;
        }

        if (newPassword.length < 8) {
            setError('Das Passwort muss mindestens 8 Zeichen lang sein');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await axios.post('/api/auth/change-password', {
                currentPassword: password,
                newPassword
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setSuccess('Passwort erfolgreich geändert! Sie werden zur Admin-Seite weitergeleitet...');

            setTimeout(() => {
                navigate('/admin');
            }, 2000);
        } catch (error) {
            setError(error.response?.data?.message || 'Fehler beim Ändern des Passworts');
        }

        setLoading(false);
    };

    return (
        <div className="setup-admin-container">
            <div className="setup-card">
                <h1>MemeVault Admin Setup</h1>

                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        {success}
                    </div>
                )}

                {step === 'check' && (
                    <div className="loading">
                        <p>Prüfe Admin-Status...</p>
                    </div>
                )}

                {step === 'create' && initialPassword && (
                    <div className="step-create">
                        <h2>Admin-Account erstellt!</h2>
                        <div className="credentials-box">
                            <p><strong>Benutzername:</strong> admin</p>
                            <p><strong>Temporäres Passwort:</strong>
                                <code className="password-display">{initialPassword}</code>
                            </p>
                            <p className="warning">
                                ⚠️ Notieren Sie sich dieses Passwort! Es wird nur einmal angezeigt.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setPassword(initialPassword);
                                setStep('login');
                            }}
                            className="btn btn-primary"
                        >
                            Weiter zum Login
                        </button>
                    </div>
                )}

                {step === 'login' && (
                    <div className="step-login">
                        <h2>Admin Login</h2>
                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label>Benutzername</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled
                                    className="form-control"
                                />
                            </div>
                            <div className="form-group">
                                <label>Passwort</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="form-control"
                                    placeholder="Admin-Passwort eingeben"
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
                    </div>
                )}

                {step === 'changePassword' && (
                    <div className="step-change-password">
                        <h2>Passwort ändern</h2>
                        <p>Bitte ändern Sie das temporäre Passwort aus Sicherheitsgründen.</p>
                        <form onSubmit={handleChangePassword}>
                            <div className="form-group">
                                <label>Neues Passwort</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength="8"
                                    className="form-control"
                                    placeholder="Mindestens 8 Zeichen"
                                />
                            </div>
                            <div className="form-group">
                                <label>Passwort bestätigen</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="form-control"
                                    placeholder="Passwort wiederholen"
                                />
                            </div>
                            <div className="button-group">
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin')}
                                    className="btn btn-secondary"
                                >
                                    Später ändern
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary"
                                >
                                    {loading ? 'Ändere...' : 'Passwort ändern'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SetupAdmin;