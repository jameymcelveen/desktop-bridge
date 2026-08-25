export const SAMPLE_WEATHER = {
  temperature: 73,
  high: 87,
  low: 66,
  wind: 4,
  label: 'Overcast',
  place: 'Florence, SC',
  units: { temperature: '°F', wind: 'mph' },
};

export const SAMPLE_STATUS_OFFLINE = {
  state: 'offline',
};

export const SAMPLE_STATUS_ONLINE = {
  state: 'online',
  receivedAt: new Date().toISOString(),
  ageMs: 4000,
  bridge: {
    hostname: 'studio.local',
    publicIp: '203.0.113.10',
    lanPrimary: '192.168.1.42',
    loadAverage: [0.42, 0.38, 0.31],
    uptimeSeconds: 3600 * 14,
    memory: { totalBytes: 32 * 1024 ** 3, freeBytes: 12 * 1024 ** 3 },
  },
};

export const SAMPLE_LINKS = [
  { id: 'github', title: 'GitHub', url: 'https://github.com/jameymcelveen', icon: 'github' },
  { id: 'claude', title: 'Claude', url: 'https://claude.ai', icon: 'spark' },
  { id: 'cursor', title: 'Cursor', url: 'https://cursor.com', icon: 'cursor' },
  { id: 'mail', title: 'Mail', url: 'https://mail.google.com', icon: 'mail' },
];
