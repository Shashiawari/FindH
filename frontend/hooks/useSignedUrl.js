'use client';

import API_URL from '../lib/api.js';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

// Get the Supabase project URL from env for public images
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// ─────────────────────────────────────────────────────────
// PUBLIC URL for the room-images bucket (no auth needed)
// ─────────────────────────────────────────────────────────
export function getPublicImageUrl(path) {
    if (!path) return null;
    // If it's already a full URL, return as-is
    if (path.startsWith('http')) return path;
    return `${SUPABASE_URL}/storage/v1/object/public/room-images/${path}`;
}

// ─────────────────────────────────────────────────────────
// SIGNED URL for the private documents bucket
// Works for users AND admins (pass adminToken override if needed)
// ─────────────────────────────────────────────────────────
export function useSignedUrl(dbPath, adminTokenOverride = null) {
    const { token } = useAppContext();
    const [signedUrl, setSignedUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!dbPath) {
            setLoading(false);
            return;
        }

        // Prefer adminToken override, then regular token
        const authToken = adminTokenOverride || token;
        if (!authToken) {
            setError('No auth token');
            setLoading(false);
            return;
        }

        const fetchSignedUrl = async () => {
            try {
                const encodedPath = encodeURIComponent(dbPath);
                const res = await fetch(`${API_URL}/api/files/${encodedPath}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setSignedUrl(data.signedUrl);
                } else {
                    const errData = await res.json().catch(() => ({}));
                    setError(errData.message || 'Access Denied');
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSignedUrl();
    }, [dbPath, token, adminTokenOverride]);

    return { signedUrl, loading, error };
}

// ─────────────────────────────────────────────────────────
// Component: Protected image from PRIVATE documents bucket
// ─────────────────────────────────────────────────────────
export function ProtectedImage({ path, alt, style, className }) {
    const { signedUrl, loading, error } = useSignedUrl(path);

    if (loading) return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Loading...</div>;
    if (error || !signedUrl) return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#ef4444', fontSize: '0.75rem' }}>🔒</div>;

    return <img src={signedUrl} alt={alt || ''} style={style} className={className} />;
}

// ─────────────────────────────────────────────────────────
// Component: Public image from PUBLIC room-images bucket
// ─────────────────────────────────────────────────────────
export function PublicImage({ path, alt, style, className }) {
    const [imgSrc, setImgSrc] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!path) return;
        const url = getPublicImageUrl(path);
        setImgSrc(url);
        setFailed(false);
    }, [path]);

    if (!imgSrc || failed) {
        return (
            <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e5e7eb', color: '#9ca3af', fontSize: '0.85rem', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '2rem' }}>🏠</span>
                <span>No Image</span>
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            alt={alt || ''}
            style={style}
            className={className}
            onError={() => setFailed(true)}
        />
    );
}
