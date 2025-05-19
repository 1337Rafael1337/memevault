import axios from 'axios';

// Basis-URL (optional für Produktion)
if (process.env.NODE_ENV === 'production') {
    axios.defaults.baseURL = '/api';
} else {
    axios.defaults.baseURL = 'http://localhost:5000/api';
}

// Request-Interceptor: Automatisch Token hinzufügen
axios.interceptors.request.use(
    config => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Response-Interceptor: Automatisches Logout bei 401
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            // Token ist möglicherweise abgelaufen, ausloggen
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');

            // Zu Login weiterleiten, wenn nicht bereits auf Login-Seite
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axios;