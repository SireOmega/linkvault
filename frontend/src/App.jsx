import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function App() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [errorMessage, setErrorMessage] = useState('');
  const [createdLink, setCreatedLink] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all links and health
  const refreshLinks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/links`);
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
          axios.get(`${API_BASE}/api/health`, { timeout: 3000 }).catch(() => null),
          axios.get(`${API_BASE}/api/links`).catch(() => ({ data: [] })),
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!originalUrl.trim()) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        originalUrl: originalUrl.trim(),
        customCode: customCode.trim() || undefined,
        expiresAt: expiresAt || null,
      };

      const res = await axios.post(`${API_BASE}/api/shorten`, payload);
      setCreatedLink(res.data);
      setOriginalUrl('');
      setCustomCode('');
      setExpiresAt('');
      await refreshLinks();
    } catch (err) {
      const serverMsg = err.response?.data?.error;
      const fallbackMsg = err.message || 'Failed to shorten URL. Make sure the backend is running.';
      setErrorMessage(serverMsg || fallbackMsg);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = async (text, id) => {
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
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this short link?')) return;
    try {
      await axios.delete(`${API_BASE}/api/links/${id}`);
      if (createdLink && createdLink._id === id) {
        setCreatedLink(null);
      }
      await refreshLinks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete link');
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
              onClick={() => handleCopy(createdLink.shortUrl, 'banner')}
            >
              {copiedId === 'banner' ? '✓ Copied!' : 'Copy Link'}
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
                  <td colSpan="6">
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
    </div>
  );
}
