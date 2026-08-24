import { platform } from 'node:os';
import { BridgeError } from '../errors.js';

export function assertMacOS(): void {
  if (platform() !== 'darwin') {
    throw new BridgeError(
      'PLATFORM_UNSUPPORTED',
      'This tool requires macOS (darwin).',
    );
  }
}
