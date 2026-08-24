export type BridgeErrorCode =
  | 'INVALID_PATH'
  | 'PATH_NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'IS_DIRECTORY'
  | 'IS_FILE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_ARGUMENT'
  | 'COMMAND_TIMEOUT'
  | 'COMMAND_DISABLED'
  | 'PLATFORM_UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'INTERNAL';

export class BridgeError extends Error {
  readonly code: BridgeErrorCode;

  constructor(code: BridgeErrorCode, message: string) {
    super(message);
    this.name = 'BridgeError';
    this.code = code;
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof BridgeError) {
    return `${err.code}: ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
