const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('studentos_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      // If unauthorized, clear invalid token if not on login endpoint
      if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        localStorage.removeItem('studentos_token');
        window.dispatchEvent(new CustomEvent('studentos:unauthorized'));
      }
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText };
      }
      const message = errorData.detail || errorData.message || 'An unexpected error occurred';
      throw new ApiError(message, response.status, errorData);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return response;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network request failed', 0, null);
  }
}

export const api = {
  // Auth
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
    demo: () => request('/auth/demo', { method: 'POST' }),
    me: () => request('/auth/me'),
    updateProfile: (profileData) => request('/auth/profile', { method: 'PUT', body: profileData }),
  },

  // Dashboard
  dashboard: {
    get: () => request('/dashboard'),
  },

  // Subjects & Attendance
  subjects: {
    list: () => request('/subjects'),
    get: (id) => request(`/subjects/${id}`),
    create: (data) => request('/subjects', { method: 'POST', body: data }),
    update: (id, data) => request(`/subjects/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),
    quickAttendance: (id, action) => request(`/subjects/${id}/quick-attendance`, { method: 'POST', body: { action } }),
  },

  // Assignments
  assignments: {
    list: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.subject_id) searchParams.append('subject_id', params.subject_id);
      if (params.status) searchParams.append('status', params.status);
      if (params.priority) searchParams.append('priority', params.priority);
      if (params.search) searchParams.append('search', params.search);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request(`/assignments${query}`);
    },
    get: (id) => request(`/assignments/${id}`),
    create: (data) => request('/assignments', { method: 'POST', body: data }),
    update: (id, data) => request(`/assignments/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/assignments/${id}`, { method: 'DELETE' }),
    toggleStatus: (id) => request(`/assignments/${id}/toggle-status`, { method: 'PATCH' }),
  },

  // Study Planner
  study: {
    list: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.date) searchParams.append('date', params.date);
      if (params.start_date) searchParams.append('start_date', params.start_date);
      if (params.end_date) searchParams.append('end_date', params.end_date);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request(`/study-sessions${query}`);
    },
    summary: () => request('/study-sessions/summary'),
    create: (data) => request('/study-sessions', { method: 'POST', body: data }),
    update: (id, data) => request(`/study-sessions/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/study-sessions/${id}`, { method: 'DELETE' }),
    toggle: (id) => request(`/study-sessions/${id}/toggle`, { method: 'PATCH' }),
  },

  // Examinations
  exams: {
    list: () => request('/examinations'),
    get: (id) => request(`/examinations/${id}`),
    create: (data) => request('/examinations', { method: 'POST', body: data }),
    update: (id, data) => request(`/examinations/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/examinations/${id}`, { method: 'DELETE' }),
  },

  // Performance Analytics
  analytics: {
    get: () => request('/analytics'),
  },

  // Export URLs
  export: {
    getJsonUrl: () => `${API_BASE}/export/json`,
    getCsvUrl: () => `${API_BASE}/export/csv/attendance`,
    downloadJson: async () => {
      const token = localStorage.getItem('studentos_token');
      const response = await fetch(`${API_BASE}/export/json`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `StudentOS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    downloadCsv: async () => {
      const token = localStorage.getItem('studentos_token');
      const response = await fetch(`${API_BASE}/export/csv/attendance`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `StudentOS_Attendance_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }
};
