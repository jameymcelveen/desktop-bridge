import type { BridgeConfig } from './config.js';
import type { PathGuard } from './lib/paths.js';

export type AppContext = {
  config: BridgeConfig;
  paths: PathGuard;
};
