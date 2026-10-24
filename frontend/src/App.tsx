import { useState, useEffect, useMemo, type FormEvent } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import type { LinkItem, BackendStatus, ShortenPayload } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:5000';

export default function App() {
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [customCode, setCustomCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [createdLink, setCreatedLink] = useState<LinkItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [qrModalLink, setQrModalLink] = useState<LinkItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrGenerating, setQrGenerating] = useState<boolean>(false);

  const openQrModal = (link: LinkItem) => {
    setQrModalLink(link);
    if (link.qrCode) {
      setQrDataUrl(link.qrCode);
      setQrGenerating(false);
    } else {
      setQrDataUrl('');
      setQrGenerating(true);
      const shortUrl = link.shortUrl || `${API_BASE}/${link.shortCode}`;
      QRCode.toDataURL(shortUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => {
          setQrDataUrl(url);
        })
        .catch((err) => {
          console.error('Failed to generate QR code data URL:', err);
        })
        .finally(() => {
          setQrGenerating(false);
        });
    }
  };

  const closeQrModal = () => {
    setQrModalLink(null);
    setQrDataUrl('');
    setQrGenerating(false);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeQrModal();
      }
    };
    if (qrModalLink) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [qrModalLink]);

  const handleDownloadPng = () => {
    if (!qrModalLink) return;
    if (qrDataUrl) {
      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = `qr-${qrModalLink.shortCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(`${API_BASE}/api/links/${qrModalLink.shortCode}/qr?download=true`, '_blank');
    }
  };

  const handleDownloadSvg = async () => {
    if (!qrModalLink) return;
    const shortUrl = qrModalLink.shortUrl || `${API_BASE}/${qrModalLink.shortCode}`;
    try {
      const svgString = await QRCode.toString(shortUrl, {
        type: 'svg',
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${qrModalLink.shortCode}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(`${API_BASE}/api/links/${qrModalLink.shortCode}/qr?format=svg&download=true`, '_blank');
    }
  };

  // Fetch all links and health
  const refreshLinks = async (): Promise<void> => {
    try {
      const res = await axios.get<LinkItem[]>(`${API_BASE}/api/links`);
      setLinks(Array.isArray(res.data) ? res.data : []);
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialData() {
      try {
        const [healthRes, linksRes] = await Promise.all([
          axios.get<{ status: string }>(`${API_BASE}/api/health`, { timeout: 3000 }).catch(() => null),
          axios.get<LinkItem[]>(`${API_BASE}/api/links`).catch(() => ({ data: [] as LinkItem[] })),
        ]);

        if (isCancelled) return;

        if (healthRes?.data?.status === 'ok') {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }

        if (Array.isArray(linksRes.data)) {
          setLinks(linksRes.data);
        }
      } catch {
        if (!isCancelled) {
          setBackendStatus('offline');
        }
      }
    }

    loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Handle URL Shortening
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!originalUrl.trim()) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const payload: ShortenPayload = {
        originalUrl: originalUrl.trim(),
        customCode: customCode.trim() || undefined,
        expiresAt: expiresAt || null,
      };

      const res = await axios.post<LinkItem>(`${API_BASE}/api/shorten`, payload);
      setCreatedLink(res.data);
      setOriginalUrl('');
      setCustomCode('');
      setExpiresAt('');
      await refreshLinks();
    } catch (err: unknown) {
      let serverMsg = '';
      let fallbackMsg = 'Failed to shorten URL. Make sure the backend is running.';
      if (axios.isAxiosError(err)) {
        serverMsg = (err.response?.data as { error?: string } | undefined)?.error || '';
        fallbackMsg = err.message || fallbackMsg;
      }
      setErrorMessage(serverMsg || fallbackMsg);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = async (text: string, id: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback if clipboard API is blocked
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Delete a link
  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this short link?')) return;
    try {
      await axios.delete(`${API_BASE}/api/links/${id}`);
      if (createdLink && createdLink._id === id) {
        setCreatedLink(null);
      }
      await refreshLinks();
    } catch (err: unknown) {
      let msg = 'Failed to delete link';
      if (axios.isAxiosError(err)) {
        msg = (err.response?.data as { error?: string } | undefined)?.error || msg;
      }
      alert(msg);
    }
  };

  // Precompute metrics and filtered links using backend-provided `isExpired`
  const { filteredLinks, totalClicks, activeCount, expiredCount } = useMemo(() => {
    let clicks = 0;
    let active = 0;
    let expired = 0;

    for (const link of links) {
      clicks += link.clicks || 0;
      if (link.isExpired) {
        expired++;
      } else {
        active++;
      }
    }

    const q = searchQuery.toLowerCase().trim();
    const filtered = q
      ? links.filter(
          (l) =>
            (l.shortCode && l.shortCode.toLowerCase().includes(q)) ||
            (l.originalUrl && l.originalUrl.toLowerCase().includes(q))
        )
      : links;

    return {
      filteredLinks: filtered,
      totalClicks: clicks,
      activeCount: active,
      expiredCount: expired,
    };
  }, [links, searchQuery]);

  return (
    <div className="container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div className="brand-text">
            <h1>Link Vault</h1>
            <p>High-performance URL Shortener & Analytics</p>
          </div>
        </div>

        <div className="system-status">
          <span
            className={`status-dot ${backendStatus === 'online' ? 'online' : 'offline'}`}
          />
          <span>{backendStatus === 'online' ? 'Backend Connected' : backendStatus === 'checking' ? 'Connecting...' : 'Backend Offline'}</span>
        </div>
      </header>

      {/* Shortener Form Card */}
      <section className="card">
        <h2 className="form-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Short Link
        </h2>

        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="originalUrl">
              Destination URL <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="originalUrl"
              type="text"
              className="input-field"
              placeholder="e.g. https://example.com/very-long-article-url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </div>

          <div className="options-row">
            <div className="input-group">
              <label className="input-label" htmlFor="customCode">
                Custom Alias (Optional)
              </label>
              <input
                id="customCode"
                type="text"
                className="input-field"
                placeholder="e.g. my-cool-link"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="expiresAt">
                Expiration Date (Optional)
              </label>
              <input
                id="expiresAt"
                type="datetime-local"
                className="input-field"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                onClick={(e) => {
                  // Open the native calendar picker on full-field click.
                  if ('showPicker' in e.currentTarget) {
                    try { e.currentTarget.showPicker(); } catch { /* Browser blocked it — user can use the native icon. */ }
                  }
                }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Generating Short Link...' : 'Shorten URL'}
          </button>
        </form>
      </section>

      {/* Success Notification Banner */}
      {createdLink && (
        <section className="success-banner">
          <div className="success-header">
            <div className="success-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              URL Shortened Successfully!
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setCreatedLink(null)}
              style={{ padding: '4px 8px' }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          <div className="success-link-box">
            <span className="success-link-text">{createdLink.shortUrl}</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleCopy(createdLink.shortUrl || '', 'banner')}
            >
              {copiedId === 'banner' ? '✓ Copied!' : 'Copy Link'}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => openQrModal(createdLink)}
              title="Generate and view QR Code"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              QR Code
            </button>
            <a
              href={createdLink.shortUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              Visit ↗
            </a>
          </div>
        </section>
      )}

      {/* Analytics Summary */}
      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Links</span>
          <span className="stat-value">{links.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Clicks</span>
          <span className="stat-value">{totalClicks}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Links</span>
          <span className="stat-value" style={{ color: 'var(--success)' }}>{activeCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Expired Links</span>
          <span className="stat-value" style={{ color: 'var(--warning)' }}>{expiredCount}</span>
        </div>
      </section>

      {/* Dashboard Table */}
      <section className="dashboard-section">
        <div className="dashboard-header">
          <h2 className="dashboard-title">Links Dashboard</h2>
          <input
            type="search"
            className="search-input"
            placeholder="Search links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="table-wrapper">
          <table className="links-table">
            <thead>
              <tr>
                <th>Short Link</th>
                <th>Original URL</th>
                <th>Clicks</th>
                <th>Status</th>
                <th>Expires</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <p>{searchQuery ? 'No links match your search query.' : 'No shortened links yet. Create your first link above!'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => {
                  const shortUrl = link.shortUrl || `${API_BASE}/${link.shortCode}`;
                  const isExp = link.isExpired;

                  return (
                    <tr key={link._id} style={{ opacity: isExp ? 0.6 : 1 }}>
                      <td>
                        <div className="link-short-cell">
                          <a href={shortUrl} target="_blank" rel="noreferrer">
                            /{link.shortCode}
                          </a>
                        </div>
                      </td>
                      <td>
                        <div className="link-original-cell" title={link.originalUrl}>
                          {link.originalUrl}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-clicks">
                          {link.clicks || 0} clicks
                        </span>
                      </td>
                      <td>
                        {isExp ? (
                          <span className="badge badge-expired">Expired</span>
                        ) : (
                          <span className="badge badge-active">Active</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {link.expiresAt
                          ? new Date(link.expiresAt).toLocaleString()
                          : 'Never'}
                      </td>
                      <td>
                        <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleCopy(shortUrl, link._id)}
                            title="Copy short link"
                          >
                            {copiedId === link._id ? '✓ Copied' : 'Copy'}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openQrModal(link)}
                            title="Generate QR code for this shortened link"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="7" height="7" />
                              <rect x="14" y="3" width="7" height="7" />
                              <rect x="14" y="14" width="7" height="7" />
                              <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            QR
                          </button>
                          <button
                            className="btn btn-danger-ghost btn-sm"
                            onClick={() => handleDelete(link._id)}
                            title="Delete link"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* QR Code Modal Dialog */}
      {qrModalLink && (
        <div
          className="modal-backdrop"
          onClick={closeQrModal}
          role="presentation"
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
          >
            <div className="modal-header">
              <div className="modal-title-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <h3 id="qr-modal-title">QR Code</h3>
                <span className="badge badge-clicks">/{qrModalLink.shortCode}</span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 8px' }}
                onClick={closeQrModal}
                title="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="qr-code-wrapper">
                {qrGenerating ? (
                  <div className="qr-loading">Generating QR Code...</div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code mapping to ${qrModalLink.shortUrl || qrModalLink.shortCode}`}
                    width={220}
                    height={220}
                    className="qr-image"
                  />
                ) : (
                  <div className="qr-loading">Failed to load QR code</div>
                )}
              </div>

              <div className="qr-info-block">
                <div className="qr-link-box">
                  <span className="qr-link-text">
                    {qrModalLink.shortUrl || `${API_BASE}/${qrModalLink.shortCode}`}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      handleCopy(
                        qrModalLink.shortUrl || `${API_BASE}/${qrModalLink.shortCode}`,
                        'modal'
                      )
                    }
                    title="Copy short link"
                  >
                    {copiedId === 'modal' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="qr-explanation">
                  This QR code encodes the shortened link. Scanning it records analytics clicks and directs visitors to:
                </p>
                <p className="qr-destination" title={qrModalLink.originalUrl}>
                  {qrModalLink.originalUrl}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline btn-sm"
                onClick={handleDownloadPng}
                title="Download PNG image"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                PNG
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleDownloadSvg}
                title="Download SVG vector"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                SVG
              </button>
              <a
                href={qrModalLink.shortUrl || `${API_BASE}/${qrModalLink.shortCode}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
              >
                Visit Link ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
