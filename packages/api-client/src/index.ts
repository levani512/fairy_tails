import {
  manifestSchema,
  type Catalog,
  type Language,
  type Preview,
  type Tag,
  type Channel,
} from '../../shared/src/index';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export class ApiClient {
  constructor(
    public base: string,
    public language: Language = 'en',
    public token?: string,
  ) {}
  async get<T>(
    path: string,
    query: Record<string, string | undefined> = {},
    signal?: AbortSignal,
  ): Promise<T> {
    const q = new URLSearchParams({ language: this.language });
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined) q.set(k, v);
    });
    const r = await fetch(`${this.base}${path}?${q}`, {
      signal,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    const body = await r.json();
    if (!r.ok)
      throw new ApiError(
        body.error?.message ?? 'Unable to connect',
        r.status,
        body.error?.code ?? 'SERVER_FAILURE',
      );
    return body.data as T;
  }
  home(query: Record<string, string | undefined>, signal?: AbortSignal) {
    return this.get<Catalog>('/home', query, signal);
  }
  tags() {
    return this.get<Tag[]>('/tags');
  }
  preview(id: string) {
    return this.get<Preview>(`/stories/${encodeURIComponent(id)}/preview`);
  }
  async manifest(id: string, download = false) {
    return manifestSchema.parse(
      await this.get(
        `/stories/${encodeURIComponent(id)}/${download ? 'download-manifest' : 'manifest'}`,
      ),
    );
  }
  async developmentSession(context: {
    premium: boolean;
    country: string;
    channel: Channel;
  }) {
    const r = await fetch(`${this.base}/development/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });
    const body = await r.json();
    if (!r.ok)
      throw new ApiError(
        body.error?.message ?? 'Development session unavailable',
        r.status,
        body.error?.code ?? 'SERVER_FAILURE',
      );
    this.token = body.data.token;
    return body.data as {
      token: string;
      premium: boolean;
      country: string;
      channel: Channel;
    };
  }
}
