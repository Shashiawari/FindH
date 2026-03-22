// Central API base URL.
// Priority:
// 1. explicit env var
// 2. production fallback to deployed backend
// 3. local development fallback
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://findhbackend.vercel.app'
    : 'http://localhost:5000');

export default API_URL;
