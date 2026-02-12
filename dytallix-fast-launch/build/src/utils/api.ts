const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getApiRoot = () => {
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
        const host = window.location.hostname;
        const isDytallixHost = host === 'dytallix.com' || host.endsWith('.dytallix.com');
        if (isDytallixHost) {
            return '/api';
        }
    }

    const raw = (
        import.meta.env.VITE_AEGIS_API_URL ||
        import.meta.env.VITE_API_URL ||
        ''
    ).trim();
    if (!raw) {
        return '/api';
    }

    const base = trimTrailingSlash(raw);
    if (base.endsWith('/api')) {
        return base;
    }

    const apiIndex = base.indexOf('/api/');
    if (apiIndex !== -1) {
        return base.slice(0, apiIndex + 4);
    }

    return `${base}/api`;
};

export const buildApiUrl = (path: string) => {
    const base = trimTrailingSlash(getApiRoot());
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
};

export const buildAegisWsUrl = () => {
    const base = trimTrailingSlash(getApiRoot());
    const wsPath = `${base}/aegis/ws`;

    if (wsPath.startsWith('https://')) {
        return wsPath.replace(/^https:/, 'wss:');
    }
    if (wsPath.startsWith('http://')) {
        return wsPath.replace(/^http:/, 'ws:');
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${wsPath}`;
};
