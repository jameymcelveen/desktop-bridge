import os from 'node:os';

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const CACHE_MS = 5 * 60_000;
const LOOKUP_URL = 'https://api.ipify.org';

export type LanAddress = {
  iface: string;
  address: string;
  family: 'IPv4';
};

let cached: { ip: string; at: number } | null = null;

function isPrivateV4(address: string): boolean {
  return (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

export function lanAddresses(
  nics: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces(),
): LanAddress[] {
  const out: LanAddress[] = [];
  for (const [iface, addrs] of Object.entries(nics)) {
    if (!addrs) {
      continue;
    }
    for (const addr of addrs) {
      const family = String(addr.family);
      if (family !== 'IPv4' && family !== '4') {
        continue;
      }
      if (addr.internal || addr.address.startsWith('169.254.')) {
        continue;
      }
      out.push({ iface, address: addr.address, family: 'IPv4' });
    }
  }
  return out.sort((a, b) => a.iface.localeCompare(b.iface) || a.address.localeCompare(b.address));
}

export async function lookupPublicIp(fetcher: typeof fetch = fetch): Promise<string | undefined> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.ip;
  }
  try {
    const res = await fetcher(LOOKUP_URL, { signal: AbortSignal.timeout(4_000) });
    if (!res.ok) {
      return cached?.ip;
    }
    const text = (await res.text()).trim();
    if (!IPV4.test(text)) {
      return cached?.ip;
    }
    cached = { ip: text, at: Date.now() };
    return text;
  } catch {
    return cached?.ip;
  }
}

export function resetPublicIpCache(): void {
  cached = null;
}

export function summarizeNetwork(lan: LanAddress[], publicIp?: string): {
  publicIp?: string;
  lan: LanAddress[];
  lanPrimary?: string;
} {
  const primary = lan.find((row) => isPrivateV4(row.address)) ?? lan[0];
  return {
    publicIp,
    lan,
    lanPrimary: primary?.address,
  };
}
