
import axios from 'axios';

const normalizeBaseUrl = (baseUrl) => {
    return String(baseUrl || '')
        .trim()
        .replace(/\/+$/, '');
};

const getApiBaseUrl = () => {
    const environmentUrl = normalizeBaseUrl(
        import.meta.env.VITE_API_URL
    );

    if (environmentUrl) {
        return environmentUrl;
    }

    return 'http://127.0.0.1:8000/api';
};

const clearLocalSession = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30000,
    headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('admin_token');

        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Multipart boundary ditentukan browser.
        if (config.data instanceof FormData) {
            if (
                config.headers &&
                typeof config.headers.delete === 'function'
            ) {
                config.headers.delete('Content-Type');
            } else if (config.headers) {
                delete config.headers['Content-Type'];
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

const shouldRefreshNotifications = (config) => {
    const method = String(config?.method || 'get')
        .toLowerCase();

    if (!['post', 'put', 'patch', 'delete'].includes(method)) {
        return false;
    }

    const url = String(config?.url || '');

    // Perubahan yang memengaruhi status pengajuan atau stok.
    return /\/(orders|humas-service-requests|borrow-requests|products)(\/|$)/.test(
        url
    );
};

api.interceptors.response.use(
    (response) => {
        // Dijalankan hanya setelah request mutasi berhasil.
        if (shouldRefreshNotifications(response.config)) {
            window.dispatchEvent(
                new Event('humas:notifications:refresh')
            );
        }

        return response;
    },

    (error) => {
        const status = error?.response?.status;
        const requestUrl = error?.config?.url || '';

        const isLoginRequest = requestUrl.includes(
            '/admin/login'
        );

        if (status === 401 && !isLoginRequest) {
            clearLocalSession();

            const currentPath = window.location.pathname;

            if (currentPath !== '/login') {
                const redirectPath = encodeURIComponent(
                    `${window.location.pathname}${window.location.search}`
                );

                window.location.replace(
                    `/login?expired=1&from=${redirectPath}`
                );
            }
        }

        return Promise.reject(error);
    }
);

export {
    clearLocalSession,
    getApiBaseUrl,
};

export default api;
