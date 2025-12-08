import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptors for auth here later (JWT)

export const AssetApi = {
    getAll: async () => {
        const res = await api.get('/assets');
        return res.data;
    },
    getOne: async (id: string) => {
        const res = await api.get(`/assets/${id}`);
        return res.data;
    },
};

export const ScanApi = {
    getAll: async () => {
        const res = await api.get('/scans');
        return res.data;
    },
    runScan: async (targets: string[]) => {
        const res = await api.post('/scans', { targets, type: 'DISCOVERY' });
        return res.data;
    }
}

export const AttestationApi = {
    createJob: async (assetIds: string[]) => {
        const res = await api.post('/attestations/jobs', { assetIds });
        return res.data;
    },
    getJobs: async () => {
        const res = await api.get('/attestations/jobs');
        return res.data;
    }
}

export default api;
