import { useState, useEffect, useMemo, type FormEvent } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import type { LinkItem, BackendStatus, ShortenPayload } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:5000';

/* --- Inline icons (lucide-style, stroke-based) ------------------------- */

const IconLink = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconHistory = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

const IconPanelClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
    <path d="m16 15-3-3 3-3" />
  </svg>
);

const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconQr = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

/* --- Helpers ------------------------------------------------------------ */

/** Compact relative timestamp for history rows ("just now", "12m", "3d"). */
const timeAgo = (iso?: string): string => {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

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
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

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
    <div className="app-shell">
      {/* ============ Main pane — utilitarian shortener ============ */}
      <main className="main-pane">
        <header className="main-header">
          <div className="brand">
            <div className="brand-icon"><IconLink /></div>
            <div className="brand-text">
              <h1>Link Vault</h1>
              <p>URL Shortener &amp; Analytics</p>
            </div>
          </div>

          <div className="header-actions">
            <div className="system-status">
              <span className={`status-dot ${backendStatus === 'online' ? 'online' : 'offline'}`} />
              <span>
                {backendStatus === 'online'
                  ? 'Connected'
                  : backendStatus === 'checking'
                    ? 'Connecting…'
                    : 'Backend Offline'}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-outline history-toggle"
              onClick={() => setHistoryOpen((o) => !o)}
              aria-expanded={historyOpen}
              aria-controls="history-sidebar"
              title={historyOpen ? 'Hide history' : 'Show history'}
            >
              <IconHistory />
              History
              <span className="history-tag">{links.length}</span>
            </button>
          </div>
        </header>

        <div className="shortener-pane">
          <div className="shortener-block">
            {errorMessage && (
              <div className="alert alert-danger" role="alert">
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="shortener-form" onSubmit={handleSubmit}>
              <div className="url-row">
                <label className="sr-only" htmlFor="originalUrl">Destination URL</label>
                <input
                  id="originalUrl"
                  type="text"
                  className="input-lg"
                  autoFocus
                  placeholder="Paste a long URL…"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Shortening…' : 'Shorten'}
                </button>
              </div>

              <div className="options-row">
                <div className="input-group">
                  <label className="input-label" htmlFor="customCode">Custom Alias</label>
                  <input
                    id="customCode"
                    type="text"
                    className="input-field"
                    placeholder="optional — e.g. my-link"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="expiresAt">Expiration</label>
                  <input
                    id="expiresAt"
                    type="datetime-local"
                    className="input-field"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    onClick={(e) => {
                      // Open the native calendar picker on full-field click.
                      if ('showPicker' in e.currentTarget) {
                        try { e.currentTarget.showPicker(); } catch { /* Browser blocked it. */ }
                      }
                    }}
                  />
                </div>
              </div>
            </form>

            {createdLink && (
              <section className="success-banner" aria-live="polite">
                <div className="success-header">
                  <div className="success-title">
                    <IconCheck />
                    Link created — {timeAgo(createdLink.createdAt) === 'just now' ? 'just now' : 'ready'}
                  </div>
                  <button
                    className="btn btn-icon"
                    onClick={() => setCreatedLink(null)}
                    title="Dismiss"
                    aria-label="Dismiss result"
                  >
                    <IconClose />
                  </button>
                </div>

                <div className="success-link-box">
                  <a className="success-link-text" href={createdLink.shortUrl} target="_blank" rel="noreferrer">
                    {createdLink.shortUrl}
                  </a>
                  <button
                    className="btn btn-icon"
                    onClick={() => handleCopy(createdLink.shortUrl || '', 'banner')}
                    title="Copy short link"
                    aria-label="Copy short link"
                  >
                    {copiedId === 'banner' ? <IconCheck /> : <IconCopy />}
                  </button>
                  <button
                    className="btn btn-icon"
                    onClick={() => openQrModal(createdLink)}
                    title="View QR code"
                    aria-label="View QR code"
                  >
                    <IconQr />
                  </button>
                </div>
              </section>
            )}

            <p className="form-hint">Enter to shorten · Press History to open your links panel</p>
          </div>
        </div>
      </main>

      {/* ============ Sidebar — collapsible links history ============ */}
      <aside
        id="history-sidebar"
        className={`sidebar${historyOpen ? ' open' : ''}`}
        inert={!historyOpen}
      >
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <div className="sidebar-title-row">
              <h2>History</h2>
              <span className="sidebar-count">{links.length}</span>
              <button
                type="button"
                className="btn btn-icon minimize-btn"
                onClick={() => setHistoryOpen(false)}
                title="Minimize history"
                aria-label="Minimize history"
              >
                <IconPanelClose />
              </button>
            </div>
            <input
              type="search"
              className="search-input"
              placeholder="Filter by code or URL…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="sidebar-stats">
            <div className="stat-chip">
              <span className="stat-chip-label">Clicks</span>
              <span className="stat-chip-value">{totalClicks}</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip-label">Links</span>
              <span className="stat-chip-value">{links.length}</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip-label">Active</span>
              <span className="stat-chip-value accent-success">{activeCount}</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip-label">Expired</span>
              <span className="stat-chip-value accent-warning">{expiredCount}</span>
            </div>
          </div>

          <div className="history-list">
            {filteredLinks.length === 0 ? (
              <div className="empty-state">
                <p>
                  {searchQuery
                    ? 'No links match your filter.'
                    : 'No links yet. Create your first one from the shortener.'}
                </p>
              </div>
            ) : (
              filteredLinks.map((link) => {
                const shortUrl = link.shortUrl || `${API_BASE}/${link.shortCode}`;
                const isExp = link.isExpired;

                return (
                  <article key={link._id} className={`history-item${isExp ? ' expired' : ''}`}>
                    <div className="history-row">
                      <a className="history-code" href={shortUrl} target="_blank" rel="noreferrer">
                        /{link.shortCode}
                      </a>
                      <span
                        className={`status-dot ${isExp ? 'expired' : 'active'} history-status`}
                        title={isExp ? 'Expired' : 'Active'}
                      />
                      <div className="history-actions">
                        <button
                          className="btn btn-icon"
                          onClick={() => handleCopy(shortUrl, link._id)}
                          title="Copy short link"
                          aria-label="Copy short link"
                        >
                          {copiedId === link._id ? <IconCheck /> : <IconCopy />}
                        </button>
                        <button
                          className="btn btn-icon"
                          onClick={() => openQrModal(link)}
                          title="View QR code"
                          aria-label="View QR code"
                        >
                          <IconQr />
                        </button>
                        <button
                          className="btn btn-icon btn-icon-danger"
                          onClick={() => handleDelete(link._id)}
                          title="Delete link"
                          aria-label="Delete link"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>

                    <div className="history-url" title={link.originalUrl}>
                      {link.originalUrl}
                    </div>

                    <div className="history-meta">
                      <span>{link.clicks || 0} clicks</span>
                      <span>{link.expiresAt ? `exp ${new Date(link.expiresAt).toLocaleDateString()}` : 'no expiry'}</span>
                      <span>{timeAgo(link.createdAt)}</span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* ============ QR Code Modal ============ */}
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
                <IconQr />
                <h3 id="qr-modal-title">QR Code</h3>
                <span className="badge badge-code">/{qrModalLink.shortCode}</span>
              </div>
              <button
                className="btn btn-icon"
                onClick={closeQrModal}
                title="Close dialog"
                aria-label="Close dialog"
              >
                <IconClose />
              </button>
            </div>

            <div className="modal-body">
              <div className="qr-code-wrapper">
                {qrGenerating ? (
                  <div className="qr-loading">Generating QR Code…</div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code mapping to ${qrModalLink.shortUrl || qrModalLink.shortCode}`}
                    width={200}
                    height={200}
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
                    className="btn btn-icon"
                    onClick={() =>
                      handleCopy(
                        qrModalLink.shortUrl || `${API_BASE}/${qrModalLink.shortCode}`,
                        'modal'
                      )
                    }
                    title="Copy short link"
                    aria-label="Copy short link"
                  >
                    {copiedId === 'modal' ? <IconCheck /> : <IconCopy />}
                  </button>
                </div>
                <p className="qr-explanation">
                  Scanning records analytics clicks and directs visitors to:
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
                <IconDownload />
                PNG
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleDownloadSvg}
                title="Download SVG vector"
              >
                <IconDownload />
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
