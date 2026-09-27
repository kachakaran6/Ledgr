import type {
  ApiResponse,
  AuthSession,
  SignUpInput,
  LoginInput,
  CreateTitleInput,
  UpdateTitleInput,
  Title,
  CreateSubtaskInput,
  UpdateSubtaskInput,
  Subtask,
  FilterSubtasksInput,
  SyncBatchInput,
  SyncResponse,
} from '@ledgr/shared';

const API_BASE = '/api';

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('logpast_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('logpast_token', token);
    } else {
      localStorage.removeItem('logpast_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (options.headers && (options.headers as any)['Accept'] === 'application/pdf') {
      if (!res.ok) throw new ApiError(res.status, 'EXPORT_FAILED', 'Failed to generate PDF');
      return (await res.blob()) as unknown as T;
    }

    const json: ApiResponse<T> = await res.json().catch(() => ({
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Unable to parse response' },
    }));

    if (!res.ok || !json.success) {
      throw new ApiError(
        res.status,
        json.error?.code || 'UNKNOWN_ERROR',
        json.error?.message || `Request failed with status ${res.status}`,
        json.error?.details
      );
    }

    return json.data as T;
  }

  // Auth
  async signup(input: SignUpInput): Promise<AuthSession> {
    const res = await this.request<AuthSession>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.setToken(res.token);
    return res;
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const res = await this.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.setToken(res.token);
    return res;
  }

  async getMe() {
    return this.request<{ id: string; email: string; name?: string }>('/auth/me');
  }

  async exportAllData() {
    return this.request<any>('/auth/export-all');
  }

  async deleteAccount() {
    return this.request<{ success: boolean }>('/auth/account', { method: 'DELETE' });
  }

  // Titles
  async getTitles(includeArchived = false): Promise<Title[]> {
    return this.request<Title[]>(`/titles?include_archived=${includeArchived}`);
  }

  async createTitle(input: CreateTitleInput): Promise<Title> {
    return this.request<Title>('/titles', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateTitle(id: string, input: UpdateTitleInput): Promise<Title> {
    return this.request<Title>(`/titles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteTitle(id: string): Promise<boolean> {
    await this.request<void>(`/titles/${id}`, { method: 'DELETE' });
    return true;
  }

  // Subtasks
  async getSubtasks(filter: Partial<FilterSubtasksInput> = {}): Promise<{ items: Subtask[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.search) params.append('search', filter.search);
    if (filter.title_ids) {
      const ids = Array.isArray(filter.title_ids) ? filter.title_ids : [filter.title_ids];
      ids.forEach((id) => params.append('title_ids', id));
    }
    if (filter.date_preset) params.append('date_preset', filter.date_preset);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);
    if (filter.status) params.append('status', filter.status);
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ items?: Subtask[]; data?: Subtask[] } | Subtask[]>(`/subtasks${query}`);

    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    const items = res.items || (res as any).data || [];
    return { items, total: items.length };
  }

  async createSubtask(input: CreateSubtaskInput): Promise<Subtask> {
    return this.request<Subtask>('/subtasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateSubtask(id: string, input: UpdateSubtaskInput): Promise<Subtask> {
    return this.request<Subtask>(`/subtasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteSubtask(id: string): Promise<boolean> {
    await this.request<void>(`/subtasks/${id}`, { method: 'DELETE' });
    return true;
  }

  async bulkDeleteSubtasks(ids: string[]): Promise<number> {
    const res = await this.request<{ deletedCount: number }>('/subtasks/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    return res.deletedCount;
  }

  // Offline Sync
  async syncBatch(input: SyncBatchInput): Promise<SyncResponse> {
    return this.request<SyncResponse>('/sync/batch', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}

export const api = new ApiClient();
