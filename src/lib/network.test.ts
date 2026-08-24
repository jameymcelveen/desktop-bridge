import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  lanAddresses,
  lookupPublicIp,
  resetPublicIpCache,
  summarizeNetwork,
} from './network.js';

describe('lanAddresses', () => {
  it('keeps non-internal IPv4 and drops loopback and link-local', () => {
    const rows = lanAddresses({
      lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true, netmask: '255.0.0.0', mac: '', cidr: null }],
      en0: [
        { address: '192.168.1.50', family: 'IPv4', internal: false, netmask: '255.255.255.0', mac: '', cidr: null },
        { address: 'fe80::1', family: 'IPv6', internal: false, netmask: 'ffff:ffff:ffff:ffff::', mac: '', cidr: null, scopeid: 0 },
      ],
      en1: [{ address: '169.254.12.4', family: 'IPv4', internal: false, netmask: '255.255.0.0', mac: '', cidr: null }],
    });
    assert.deepEqual(rows, [{ iface: 'en0', address: '192.168.1.50', family: 'IPv4' }]);
  });
});

describe('lookupPublicIp', () => {
  it('caches a valid IPv4 and ignores later failures', async () => {
    resetPublicIpCache();
    let calls = 0;
    const fetcher = async (): Promise<Response> => {
      calls += 1;
      if (calls === 1) {
        return new Response('203.0.113.9', { status: 200 });
      }
      throw new Error('network down');
    };
    assert.equal(await lookupPublicIp(fetcher), '203.0.113.9');
    assert.equal(await lookupPublicIp(fetcher), '203.0.113.9');
    assert.equal(calls, 1);
  });

  it('rejects non-IP bodies', async () => {
    resetPublicIpCache();
    const fetcher = async (): Promise<Response> => new Response('not-an-ip', { status: 200 });
    assert.equal(await lookupPublicIp(fetcher), undefined);
  });
});

describe('summarizeNetwork', () => {
  it('prefers a private LAN address as primary', () => {
    const summary = summarizeNetwork(
      [
        { iface: 'utun0', address: '100.64.1.2', family: 'IPv4' },
        { iface: 'en0', address: '10.0.0.12', family: 'IPv4' },
      ],
      '198.51.100.7',
    );
    assert.equal(summary.lanPrimary, '10.0.0.12');
    assert.equal(summary.publicIp, '198.51.100.7');
  });
});
