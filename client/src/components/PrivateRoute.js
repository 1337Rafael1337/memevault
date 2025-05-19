import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Prüft, ob der Benutzer authentifiziert ist
const isAuthenticated = () => {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    // Optionale Token-Ablaufprüfung
    try {
        // Token ist im Format: header.payload.signature
        const payload = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payload));

        // Prüfen, ob Token abgelaufen ist
        if (decodedPayload.exp * 1000 < Date.now()) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            return false;
        }

        return true;
    } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        return false;
    }
};

// Prüft, ob der Benutzer die erforderliche Rolle hat
const hasRequiredRole = (requiredRole) => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user && user.role === requiredRole;
    } catch (error) {
        return false;
    }
};

const PrivateRoute = ({ children, requiredRole = null }) => {
    const location = useLocation();

    // Prüfen, ob der Benutzer angemeldet ist
    if (!isAuthenticated()) {
        // Zu Login umleiten mit aktueller Position
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Wenn eine Rolle erforderlich ist, prüfe diese
    if (requiredRole && !hasRequiredRole(requiredRole)) {
        // Zu einer Fehlerseite oder Home umleiten
        return <Navigate to="/unauthorized" replace />;
    }

    // Wenn alles in Ordnung ist, zeige die geschützte Komponente
    return children;
};

export default PrivateRoute;