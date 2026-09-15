export type ServerResponseTypes = 'success' | 'error' | 'warning';

export type ServerResponseCodes = 'OK_CREATED' | 'OK_UPDATED' | 'ERR_UNAUTHORIZED' | 'ERR_CONFLICT' | 'ERR_INTERNAL';

export interface ServerApiResponse<T = Record<string, any>> {
  code: ServerResponseCodes;
  type: ServerResponseTypes;
  message: string;
  data?: T;
}