const API = import.meta.env.VITE_API_URL || '';

function token() {
  return localStorage.getItem('tp_token');
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` };
}

async function request(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

async function upload(method, path, formData) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}` },
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
  return data;
}

export const api = {
  login: (password) =>
    fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Ошибка входа');
      return d;
    }),

  me: () => request('GET', '/api/auth/me'),

  properties: () => request('GET', '/api/properties'),

  utilityTypes: () => request('GET', '/api/utility-types'),

  readings: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/api/readings${q ? '?' + q : ''}`);
  },
  addReading: (formData) => upload('POST', '/api/readings', formData),
  deleteReading: (id) => request('DELETE', `/api/readings/${id}`),

  documents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/api/documents${q ? '?' + q : ''}`);
  },
  uploadDocument: (formData) => upload('POST', '/api/documents', formData),
  deleteDocument: (id) => request('DELETE', `/api/documents/${id}`),

  requests: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/api/requests${q ? '?' + q : ''}`);
  },
  addRequest: (formData) => upload('POST', '/api/requests', formData),
  updateRequest: (id, body) => request('PATCH', `/api/requests/${id}`, body),

  notifications: () => request('GET', '/api/notifications'),
  sendNotification: (body) => request('POST', '/api/notifications', body),
  markRead: (id) => request('POST', `/api/notifications/${id}/read`),
  deleteNotification: (id) => request('DELETE', `/api/notifications/${id}`),

  users: () => request('GET', '/api/users'),
  addUser: (body) => request('POST', '/api/users', body),
  updateUser: (id, body) => request('PATCH', `/api/users/${id}`, body),
  deleteUser: (id) => request('DELETE', `/api/users/${id}`),

  activity: () => request('GET', '/api/activity'),
};
