import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    headers: {
        Accept: 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    /**
     * Penting:
     * Jangan paksa Content-Type application/json untuk FormData,
     * karena upload file butuh multipart/form-data dengan boundary otomatis dari browser.
     */
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;