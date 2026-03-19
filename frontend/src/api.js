// ── JobMatcher API Client (Supabase Auth + Node.js backend) ─────
const API_BASE       = 'https://jobmatcher-backend-production.up.railway.app/api';
const SUPABASE_URL   = 'https://your-project-ref.supabase.co';  // ← replace
const SUPABASE_ANON  = 'your-anon-key-here';                     // ← replace

// ── Token helpers ─────────────────────────────────────────────────
const api = {
  getToken:    () => localStorage.getItem('jm_token'),
  setToken:    (t) => localStorage.setItem('jm_token', t),
  getRefresh:  () => localStorage.getItem('jm_refresh'),
  setRefresh:  (t) => localStorage.setItem('jm_refresh', t),
  getUser:     () => JSON.parse(localStorage.getItem('jm_user') || 'null'),
  setUser:     (u) => localStorage.setItem('jm_user', JSON.stringify(u)),
  clear:       ()  => { localStorage.removeItem('jm_token'); localStorage.removeItem('jm_refresh'); localStorage.removeItem('jm_user'); },
  clearToken:  ()  => { localStorage.removeItem('jm_token'); localStorage.removeItem('jm_refresh'); },
  clearUser:   ()  => localStorage.removeItem('jm_user'),

  // ── Core fetch wrapper ──────────────────────────────────────────
  async request(endpoint, options = {}) {
    const token   = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    // Auto-refresh token if expired
    if (res.status === 401 && this.getRefresh()) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      }
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Something went wrong');
    return data;
  },

  async refreshToken() {
    try {
      const res  = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.getRefresh() }),
      });
      const data = await res.json();
      if (res.ok) { this.setToken(data.token); this.setRefresh(data.refreshToken); return true; }
      return false;
    } catch { return false; }
  },

  // ── Auth (calls Node.js which calls Supabase) ───────────────────
  register:           (body) => api.request('/auth/register',            { method: 'POST', body: JSON.stringify(body) }),
  login:              (body) => api.request('/auth/login',               { method: 'POST', body: JSON.stringify(body) }),
  resendVerification: (body) => api.request('/auth/resend-verification', { method: 'POST', body: JSON.stringify(body) }),
  refresh:            (body) => api.request('/auth/refresh',             { method: 'POST', body: JSON.stringify(body) }),
  me:                 ()     => api.request('/auth/me'),

  // ── Profile ─────────────────────────────────────────────────────
  updateProfile: (body) => api.request('/users/profile', { method: 'PUT', body: JSON.stringify(body) }),
  uploadAvatar: (formData) => {
    const token = api.getToken();
    return fetch(`${API_BASE}/users/upload-avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(r => r.json());
  },

  // ── Jobs ─────────────────────────────────────────────────────────
  getJobs:   (params = {}) => api.request('/jobs?' + new URLSearchParams(params)),
  getMyJobs: ()            => api.request('/jobs/my'),
  createJob: (body)        => api.request('/jobs', { method: 'POST', body: JSON.stringify(body) }),
  updateJob: (id, body)    => api.request(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteJob: (id)          => api.request(`/jobs/${id}`, { method: 'DELETE' }),

  // ── Matches ──────────────────────────────────────────────────────
  getMatches: () => api.request('/matches'),

  // ── Applications ─────────────────────────────────────────────────
  apply:              (body)         => api.request('/applications', { method: 'POST', body: JSON.stringify(body) }),
  getMyApps:          ()             => api.request('/applications/mine'),
  getEmpApps:         ()             => api.request('/applications/employer'),
  updateAppStatus:    (id, status)   => api.request(`/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  scheduleInterview:  (id, body)     => api.request(`/applications/${id}/schedule`, { method: 'PUT', body: JSON.stringify(body) }),

  // ── Chat ─────────────────────────────────────────────────────────
  getChatRooms: ()        => api.request('/chat/rooms'),
  getMessages:  (roomId)  => api.request(`/chat/${roomId}`),
  sendMessage:  (body)    => api.request('/chat', { method: 'POST', body: JSON.stringify(body) }),
};
