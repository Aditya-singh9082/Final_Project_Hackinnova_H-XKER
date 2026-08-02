/**
 * API configuration — resolves the backend base URL.
 *
 * In production with Render backend:
 *   Set VITE_API_URL=https://your-render-app.onrender.com in Vercel env vars
 *
 * In local development:
 *   Falls back to '' (same-origin, proxied by Vite dev server)
 */
export const API_BASE = import.meta.env.VITE_API_URL || '';
