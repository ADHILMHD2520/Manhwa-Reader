import axios from "axios";
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const ADMIN_TOKEN_KEY = "manhwa-admin-token";
export const api = axios.create({ baseURL });
export const adminApi = axios.create({ baseURL: `${baseURL}/admin` });
export function getAdminToken() {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}
export function setAdminToken(token) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}
export function clearAdminToken() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}
adminApi.interceptors.request.use((request) => {
    const token = getAdminToken();
    if (token)
        request.headers.Authorization = `Bearer ${token}`;
    return request;
});
adminApi.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        clearAdminToken();
        window.dispatchEvent(new Event("manhwa:admin-signed-out"));
    }
    return Promise.reject(error);
});
function createReaderId() {
    // crypto.randomUUID only exists on HTTPS/localhost, so a phone opening http://192.168.x.x would crash.
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
        return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export function readerId() {
    const key = "manhwa-reader-id";
    let id = localStorage.getItem(key);
    if (!id) {
        id = createReaderId();
        localStorage.setItem(key, id);
    }
    return id;
}
export const readerHeaders = () => ({ "x-reader-id": readerId() });
export const adminAuth = {
    login: async (email, password) => (await api.post("/auth/admin/login", { email, password })).data,
};
export const publicApi = {
    manhwaList: async () => (await api.get("/manhwa")).data.manhwa,
    manhwa: async (id) => (await api.get(`/manhwa/${id}`)).data.manhwa,
    chapters: async (manhwaId) => (await api.get(`/manhwa/${manhwaId}/chapters`)).data.chapters,
    chapter: async (id) => (await api.get(`/chapters/${id}`)).data.chapter,
    pages: async (id) => (await api.get(`/chapters/${id}/pages`)).data.pages,
    progress: async (id) => (await api.get(`/chapters/${id}/progress`, { headers: readerHeaders() })).data.pageNumber,
    saveProgress: async (id, pageNumber) => api.post(`/chapters/${id}/progress`, { pageNumber }, { headers: readerHeaders() }),
};
export const admin = {
    manhwa: async () => (await adminApi.get("/manhwa")).data.manhwa,
    chapters: async (manhwaId) => (await adminApi.get(`/manhwa/${manhwaId}/chapters`)).data.chapters,
    createManhwa: async (form) => (await adminApi.post("/manhwa", form)).data.manhwa,
    updateManhwa: async (id, form) => (await adminApi.put(`/manhwa/${id}`, form)).data.manhwa,
    deleteManhwa: async (id) => adminApi.delete(`/manhwa/${id}`),
    uploadChapter: (form, onProgress) => adminApi.post("/chapters/upload", form, {
        onUploadProgress: (event) => onProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
    }),
    bulkUpload: (form, onProgress) => adminApi.post("/chapters/bulk-upload", form, {
        onUploadProgress: (event) => onProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
    }),
    status: async (id) => (await adminApi.get(`/chapters/${id}/status`)).data,
    previewPdf: async (id) => (await adminApi.get(`/chapters/${id}/pdf`)).data.url,
    updateChapter: async (id, values) => (await adminApi.patch(`/chapters/${id}`, values)).data.chapter,
    retryChapter: async (id) => (await adminApi.post(`/chapters/${id}/retry`)).data.chapter,
    deleteChapter: async (id) => adminApi.delete(`/chapters/${id}`),
};
