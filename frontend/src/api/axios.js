import axios from 'axios';

const normalizeBaseUrl = (
    baseUrl
) => {
    return String(
        baseUrl || ''
    )
        .trim()
        .replace(/\/+$/, '');
};

const getApiBaseUrl = () => {
    const environmentUrl =
        normalizeBaseUrl(
            import.meta.env
                .VITE_API_URL
        );

    if (environmentUrl) {
        return environmentUrl;
    }

    return 'http://127.0.0.1:8000/api';
};

const clearLocalSession = () => {
    localStorage.removeItem(
        'admin_token'
    );

    localStorage.removeItem(
        'admin_user'
    );
};

const api = axios.create({
    baseURL:
        getApiBaseUrl(),

    timeout:
        30000,

    headers: {
        Accept:
            'application/json',

        'X-Requested-With':
            'XMLHttpRequest',
    },
});

api.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem(
                'admin_token'
            );

        if (token) {
            config.headers =
                config.headers ||
                {};

            config.headers.Authorization =
                `Bearer ${token}`;
        }

        /*
         * Browser harus menentukan multipart boundary sendiri.
         */
        if (
            config.data instanceof
            FormData
        ) {
            if (
                config.headers &&
                typeof config.headers.delete ===
                    'function'
            ) {
                config.headers.delete(
                    'Content-Type'
                );
            } else if (
                config.headers
            ) {
                delete config.headers[
                    'Content-Type'
                ];
            }
        }

        return config;
    },
    (error) =>
        Promise.reject(error)
);

api.interceptors.response.use(
    (response) =>
        response,

    (error) => {
        const status =
            error?.response?.status;

        const requestUrl =
            error?.config?.url ||
            '';

        const isLoginRequest =
            requestUrl.includes(
                '/admin/login'
            );

        if (
            status === 401 &&
            !isLoginRequest
        ) {
            clearLocalSession();

            const currentPath =
                window.location.pathname;

            if (
                currentPath !==
                '/login'
            ) {
                const redirectPath =
                    encodeURIComponent(
                        `${window.location.pathname}${window.location.search}`
                    );

                window.location.replace(
                    `/login?expired=1&from=${redirectPath}`
                );
            }
        }

        return Promise.reject(
            error
        );
    }
);

export {
    clearLocalSession,
    getApiBaseUrl,
};

export default api;