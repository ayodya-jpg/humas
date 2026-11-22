
import axios from 'axios';

/*
|--------------------------------------------------------------------------
| KONFIGURASI BATAS UPLOAD
|--------------------------------------------------------------------------
*/

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/*
|--------------------------------------------------------------------------
| API BASE URL
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| CLEAR SESSION
|--------------------------------------------------------------------------
*/

const clearLocalSession = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
};

/*
|--------------------------------------------------------------------------
| VALIDASI FILE UPLOAD
|--------------------------------------------------------------------------
|
| Semua FormData yang dikirim melalui API ini
| diperiksa terlebih dahulu.
|
| Batas berlaku per file, bukan per request.
|
*/

const assertFileUploadLimit = (formData) => {
    if (!(formData instanceof FormData)) {
        return;
    }

    for (const [field, value] of formData.entries()) {
        if (
            typeof Blob !== 'undefined' &&
            value instanceof Blob &&
            value.size > MAX_UPLOAD_BYTES
        ) {
            const filename =
                typeof value.name === 'string' &&
                value.name
                    ? value.name
                    : field;

            throw new Error(
                `File "${filename}" melebihi batas 5 MB. ` +
                'Silakan pilih file dengan ukuran maksimal 5 MB.'
            );
        }
    }
};

/*
|--------------------------------------------------------------------------
| AXIOS INSTANCE
|--------------------------------------------------------------------------
*/

const api = axios.create({
    baseURL: getApiBaseUrl(),

    timeout: 30000,

    headers: {
        Accept: 'application/json',

        'X-Requested-With': 'XMLHttpRequest',
    },
});

/*
|--------------------------------------------------------------------------
| REQUEST INTERCEPTOR
|--------------------------------------------------------------------------
*/

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(
            'admin_token'
        );

        if (token) {
            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;
        }

        /*
        | Periksa semua file sebelum upload.
        */

        if (config.data instanceof FormData) {
            assertFileUploadLimit(
                config.data
            );

            /*
            | Content-Type multipart ditentukan
            | otomatis oleh browser.
            */

            if (
                config.headers &&
                typeof config.headers.delete ===
                    'function'
            ) {
                config.headers.delete(
                    'Content-Type'
                );
            } else if (config.headers) {
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

/*
|--------------------------------------------------------------------------
| REFRESH NOTIFIKASI
|--------------------------------------------------------------------------
*/

const shouldRefreshNotifications = (config) => {
    const method = String(
        config?.method || 'get'
    ).toLowerCase();

    if (
        ![
            'post',
            'put',
            'patch',
            'delete',
        ].includes(method)
    ) {
        return false;
    }

    const url = String(
        config?.url || ''
    );

    return /\/(orders|humas-service-requests|borrow-requests|products)(\/|$)/.test(
        url
    );
};

/*
|--------------------------------------------------------------------------
| DASHBOARD ANALYTICS RESPONSE
|--------------------------------------------------------------------------
*/

const isDashboardAnalyticsResponse = (response) => {
    const url = String(
        response?.config?.url || ''
    );

    const method = String(
        response?.config?.method || 'get'
    ).toLowerCase();

    return (
        method === 'get' &&
        /\/dashboard\/analytics(?:\?.*)?$/.test(
            url
        ) &&
        response?.data?.success === true
    );
};

/*
|--------------------------------------------------------------------------
| RESPONSE INTERCEPTOR
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(
    (response) => {

        /*
        |--------------------------------------------------------------------------
        | REFRESH NOTIFIKASI
        |--------------------------------------------------------------------------
        */

        if (
            shouldRefreshNotifications(
                response.config
            )
        ) {
            window.dispatchEvent(
                new Event(
                    'humas:notifications:refresh'
                )
            );
        }

        /*
        |--------------------------------------------------------------------------
        | SINKRONISASI DASHBOARD
        |--------------------------------------------------------------------------
        */

        if (
            isDashboardAnalyticsResponse(
                response
            )
        ) {
            const params =
                response.config?.params || {};

            window.dispatchEvent(
                new CustomEvent(
                    'humas:dashboard:filters',
                    {
                        detail: {
                            service:
                                params.service || 'all',

                            status:
                                params.status || 'all',

                            start_date:
                                params.start_date || '',

                            end_date:
                                params.end_date || '',
                        },
                    }
                )
            );
        }

        return response;
    },

    /*
    |--------------------------------------------------------------------------
    | ERROR HANDLING
    |--------------------------------------------------------------------------
    */

    (error) => {
        const status =
            error?.response?.status;

        const requestUrl =
            error?.config?.url || '';

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
                currentPath !== '/login'
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

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export {
    clearLocalSession,
    getApiBaseUrl,
};

export default api;
