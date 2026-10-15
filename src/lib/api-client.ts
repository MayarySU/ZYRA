// Este archivo contiene las funciones para comunicarse con la API del backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface FetchOptions extends RequestInit {
  token?: string;
}

/**
 * Función auxiliar para hacer requests a la API
 */
async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  // Offline Handling for mutations
  if (typeof window !== 'undefined' && !navigator.onLine && fetchOptions.method && fetchOptions.method !== 'GET') {
    const queue = JSON.parse(localStorage.getItem('zyra_offline_queue') || '[]');
    queue.push({
      id: Math.random().toString(36).substr(2, 9),
      endpoint,
      method: fetchOptions.method,
      body: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : null,
      timestamp: Date.now()
    });
    localStorage.setItem('zyra_offline_queue', JSON.stringify(queue));
    throw new Error('OFFLINE_SAVED');
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as any || {}),
  };
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('zyra_token') : null);

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API Error');
  }

  return response.json();
}

// ─────────────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────────────

export const authAPI = {
  login: (data: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
};

// ─────────────────────────────────────────────────
// USERS API
// ─────────────────────────────────────────────────

export const usersAPI = {
  getAll: () => apiRequest('/users'),
  
  getById: (id: string) => apiRequest(`/users/${id}`),
  
  getByFirebaseUid: (firebaseUid: string) =>
    apiRequest(`/users/firebase/${firebaseUid}`),
  
  create: (data: any, token?: string) =>
    apiRequest('/users', { method: 'POST', body: JSON.stringify(data), token }),
  
  update: (id: string, data: any, token?: string) =>
    apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  
  delete: (id: string, token?: string) =>
    apiRequest(`/users/${id}`, { method: 'DELETE', token }),
};

// ─────────────────────────────────────────────────
// CLIENTS API
// ─────────────────────────────────────────────────

export const clientsAPI = {
  getAll: () => apiRequest('/clientes'),
  
  getById: (id: string) => apiRequest(`/clientes/${id}`),
  
  create: (data: any, token?: string) =>
    apiRequest('/clientes', { method: 'POST', body: JSON.stringify(data), token }),
  
  update: (id: string, data: any, token?: string) =>
    apiRequest(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  
  delete: (id: string, token?: string) =>
    apiRequest(`/clientes/${id}`, { method: 'DELETE', token }),
};

// ─────────────────────────────────────────────────
// PROJECTS API
// ─────────────────────────────────────────────────

export const projectsAPI = {
  getAll: () => apiRequest('/proyectos'),
  
  getById: (id: string) => apiRequest(`/proyectos/${id}`),
  
  create: (data: any, token?: string) =>
    apiRequest('/proyectos', { method: 'POST', body: JSON.stringify(data), token }),
  
  update: (id: string, data: any, token?: string) =>
    apiRequest(`/proyectos/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  
  delete: (id: string, token?: string) =>
    apiRequest(`/proyectos/${id}`, { method: 'DELETE', token }),
  
  addMember: (projectId: string, userId: string, role: string, token?: string) =>
    apiRequest(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
      token,
    }),
};

// ─────────────────────────────────────────────────
// REPORTS API
// ─────────────────────────────────────────────────

export const reportsAPI = {
  getAll: (filters?: { projectId?: string; status?: string }) =>
    apiRequest('/reports', {
      method: 'GET',
    }),
  
  getById: (id: string) => apiRequest(`/reports/${id}`),
  
  create: (data: any, token?: string) =>
    apiRequest('/reports', { method: 'POST', body: JSON.stringify(data), token }),
  
  update: (id: string, data: any, token?: string) =>
    apiRequest(`/reports/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  
  delete: (id: string, token?: string) =>
    apiRequest(`/reports/${id}`, { method: 'DELETE', token }),
};

// ─────────────────────────────────────────────────
// EMPLOYEES API
// ─────────────────────────────────────────────────

export const employeesAPI = {
  getAll: () => apiRequest('/empleados'),
  
  getById: (id: string | number) => apiRequest(`/empleados/${id}`),
  
  create: (data: any, token?: string) =>
    apiRequest('/empleados', { method: 'POST', body: JSON.stringify(data), token }),
  
  update: (id: string | number, data: any, token?: string) =>
    apiRequest(`/empleados/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  
  delete: (id: string | number, token?: string) =>
    apiRequest(`/empleados/${id}`, { method: 'DELETE', token }),
    
  addPoints: (id: string | number, payload: { puntos: number, motivo: string, projectId?: number, reportId?: number }, token?: string) =>
    apiRequest(`/empleados/${id}/puntos`, { method: 'POST', body: JSON.stringify(payload), token }),
};

// ─────────────────────────────────────────────────
// MATERIALS API
// ─────────────────────────────────────────────────

export const materialsAPI = {
  getAll: () => apiRequest('/materiales'),
  
  getById: (id: string | number) => apiRequest(`/materiales/${id}`),
  
  create: (data: any, token?: string) =>
    apiRequest('/materiales', { method: 'POST', body: JSON.stringify(data), token }),
  
  update: (id: string | number, data: any, token?: string) =>
    apiRequest(`/materiales/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  
  delete: (id: string | number, token?: string) =>
    apiRequest(`/materiales/${id}`, { method: 'DELETE', token }),
};

// ─────────────────────────────────────────────────
// TEAMS API
// ─────────────────────────────────────────────────

export const teamsAPI = {
  getAll: () => apiRequest('/equipos'),
  
  getById: (id: string | number) => apiRequest(`/equipos/${id}`),
  
  create: (data: any, token?: string) =>
    apiRequest('/equipos', { method: 'POST', body: JSON.stringify(data), token }),
  
  update: (id: string | number, data: any, token?: string) =>
    apiRequest(`/equipos/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  
  delete: (id: string | number, token?: string) =>
    apiRequest(`/equipos/${id}`, { method: 'DELETE', token }),
};

// ─────────────────────────────────────────────────
// CHECKLISTS SERVICIO API (Templates)
// ─────────────────────────────────────────────────

export const checklistsServicioAPI = {
  getAll: () => apiRequest('/checklists-servicio'),
  
  getById: (id: string | number) => apiRequest(`/checklists-servicio/${id}`),
  
  update: (id: string | number, data: { materiales: { ID_Material: number, Cantidad_Requerida: number }[] }, token?: string) =>
    apiRequest(`/checklists-servicio/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
};

// ─────────────────────────────────────────────────
// SERVICIOS API
// ─────────────────────────────────────────────────

export const serviciosAPI = {
  getAll: () => apiRequest('/servicios'),
  
  getById: (id: string | number) => apiRequest(`/servicios/${id}`),
  
  create: (data: any, token?: string) =>
    apiRequest('/servicios', { method: 'POST', body: JSON.stringify(data), token }),
  
  update: (id: string | number, data: any, token?: string) =>
    apiRequest(`/servicios/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  
  delete: (id: string | number, token?: string) =>
    apiRequest(`/servicios/${id}`, { method: 'DELETE', token }),
};


// ─────────────────────────────────────────────────
// ALIASES (Compatibility)
// ─────────────────────────────────────────────────

export const empleadosAPI = employeesAPI;
export const clientesAPI = clientsAPI;
export const proyectosAPI = projectsAPI;
export const materialesAPI = materialsAPI;
export const reportesAPI = reportsAPI;
export const equiposAPI = teamsAPI;
