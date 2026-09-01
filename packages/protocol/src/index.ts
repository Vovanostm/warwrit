export const PROTOCOL_VERSION = '0.1.0' as const;
export const MAIN_WORLD_ID = 'main' as const;

export interface ApiEnvelope<Data> {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly data: Data;
}

export interface HealthResponse {
  readonly status: 'ok' | 'unavailable';
  readonly service: 'warwrit-server';
  readonly protocolVersion: typeof PROTOCOL_VERSION;
}

export function envelope<Data>(data: Data): ApiEnvelope<Data> {
  return {
    data,
    protocolVersion: PROTOCOL_VERSION,
  };
}
