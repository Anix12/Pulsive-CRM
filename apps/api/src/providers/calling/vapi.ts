import { AppError } from '@/middleware/errorHandler';

const VAPI_BASE_URL = 'https://api.vapi.ai';

export interface VapiAssistantConfig {
  name: string;
  greeting: string;
  systemPrompt: string;
  voiceId?: string;
  serverUrl?: string;
  maxDurationSeconds?: number;
}

export interface VapiCallResult {
  id: string;
  status: string;
}

export class VapiProvider {
  readonly name = 'vapi';

  constructor(private apiKey: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${VAPI_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AppError(502, 'CALLING_PROVIDER_ERROR', `Vapi API error (${res.status}): ${body || res.statusText}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async createAssistant(config: VapiAssistantConfig): Promise<{ id: string }> {
    return this.request<{ id: string }>('/assistant', {
      method: 'POST',
      body: JSON.stringify({
        name: config.name,
        firstMessage: config.greeting,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [{ role: 'system', content: config.systemPrompt }],
        },
        voice: config.voiceId ? { provider: '11labs', voiceId: config.voiceId } : undefined,
        serverUrl: config.serverUrl,
        maxDurationSeconds: config.maxDurationSeconds,
      }),
    });
  }

  async updateAssistant(assistantId: string, config: Partial<VapiAssistantConfig>): Promise<void> {
    const body: Record<string, unknown> = {};
    if (config.name) body.name = config.name;
    if (config.greeting) body.firstMessage = config.greeting;
    if (config.systemPrompt) {
      body.model = {
        provider: 'openai',
        model: 'gpt-4o',
        messages: [{ role: 'system', content: config.systemPrompt }],
      };
    }
    if (config.voiceId) body.voice = { provider: '11labs', voiceId: config.voiceId };
    if (config.maxDurationSeconds) body.maxDurationSeconds = config.maxDurationSeconds;

    await this.request(`/assistant/${assistantId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await this.request(`/assistant/${assistantId}`, { method: 'DELETE' });
  }

  async startCall(params: { assistantId: string; phoneNumberId: string; customerNumber: string }): Promise<VapiCallResult> {
    const result = await this.request<{ id: string; status: string }>('/call', {
      method: 'POST',
      body: JSON.stringify({
        assistantId: params.assistantId,
        phoneNumberId: params.phoneNumberId,
        customer: { number: params.customerNumber },
      }),
    });
    return { id: result.id, status: result.status };
  }

  async getCall(vapiCallId: string): Promise<any> {
    return this.request(`/call/${vapiCallId}`);
  }
}
