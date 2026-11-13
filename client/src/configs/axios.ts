import axios from "axios";

const baseURL =
    import.meta.env.VITE_BASEURL ||
    (import.meta.env.DEV
        ? "http://localhost:5000"
        : "https://aimaker-api-free.onrender.com");

const api = axios.create({ baseURL });

export default api;
