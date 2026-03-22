'use client';
import API_URL from '../../../lib/api.js';
import { useState, useEffect, useCallback } from 'react';

// ─── Shared helpers ───
export const getToken = () => sessionStorage.getItem('adminToken');
export const getHeaders = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

export const doFetch = async (path, opts = {}) => {
  const res = await fetch(`${API_URL}${path}`, { headers: getHeaders(), ...opts });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Request failed');
  const ct = res.headers.get('content-type');
  if (ct && ct.includes('json')) return res.json();
  return res.text();
};

export const doAction = async (path, method = 'PUT', body) => {
  return doFetch(path, { method, body: body ? JSON.stringify(body) : undefined });
};

// ─── Confirm Modal ───
export function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
        <h3 style={{ marginBottom: 8 }}>{title || 'Confirm'}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="button" style={{ padding: '10px 24px' }} onClick={onConfirm}>Confirm</button>
          <button className="button secondary" style={{ padding: '10px 24px' }} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ───
export function DetailModal({ open, title, data, onClose }) {
  if (!open || !data) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>{title || 'Details'}</h3>
          <button className="button ghost" onClick={onClose} style={{ padding: '4px 8px', fontSize: '1.2rem' }}>✕</button>
        </div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {Object.entries(data).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
              <span style={{ fontWeight: 600, minWidth: 140, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
              <span style={{ wordBreak: 'break-all', flex: 1 }}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───
export function Pagination({ total, page, perPage, onChange }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div className="pagination" style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 20 }}>
      {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
        <button key={i} onClick={() => onChange(i + 1)} className={`tab-btn${page === i + 1 ? ' active' : ''}`}
          style={{ padding: '6px 12px', fontSize: '0.82rem', minWidth: 36 }}>{i + 1}</button>
      ))}
      {pages > 10 && <span style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>...</span>}
    </div>
  );
}

// ─── Empty state ───
export function EmptyAdmin({ icon, msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>{icon}</div>
      <p style={{ color: 'var(--text-muted)' }}>{msg}</p>
    </div>
  );
}

// ─── Action Button ───
export function ActionBtn({ label, onClick, variant = '', disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`admin-action-btn ${variant}`}
      style={{ padding: small ? '6px 14px' : '8px 18px', fontSize: small ? '0.75rem' : '0.82rem', whiteSpace: 'nowrap' }}>
      {label}
    </button>
  );
}

// ─── Table wrapper ───
export function DataTableWrap({ children }) {
  return (
    <div style={{ overflowX: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
      <table className="data-table">{children}</table>
    </div>
  );
}
