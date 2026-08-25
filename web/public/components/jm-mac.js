import { LitElement, css, html } from 'lit';
import './jm-card.js';

function formatBytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    return '—';
  }
  return `${(n / 1024 ** 3).toFixed(1)} GiB`;
}

function formatAge(ms) {
  if (ms === null || ms === undefined) {
    return 'never';
  }
  if (ms < 2000) {
    return 'just now';
  }
  const s = Math.round(ms / 1000);
  if (s < 60) {
    return `${s}s ago`;
  }
  const m = Math.round(s / 60);
  if (m < 60) {
    return `${m}m ago`;
  }
  return `${Math.round(m / 60)}h ago`;
}

export class JmMac extends LitElement {
  static properties = {
    status: { type: Object },
    copied: { state: true },
  };

  static styles = css`
    :host {
      display: block;
    }
    .state {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      margin: 0 0 0.35rem;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .dot {
      width: 0.7rem;
      height: 0.7rem;
      border-radius: 50%;
      background: var(--muted);
    }
    .dot.online {
      background: var(--ok);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--ok) 25%, transparent);
    }
    .dot.stale {
      background: var(--warn);
    }
    .dot.offline {
      background: var(--off);
    }
    .muted {
      color: var(--muted);
      margin: 0;
    }
    .facts {
      display: grid;
      grid-template-columns: 6.5rem 1fr;
      gap: 0.35rem 0.8rem;
      margin: 0.85rem 0 0;
    }
    dt {
      color: var(--muted);
      font-size: 0.8rem;
    }
    dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
      font-size: 0.9rem;
    }
    .copy {
      margin-left: 0.35rem;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 0.75rem;
      cursor: pointer;
    }
  `;

  constructor() {
    super();
    this.status = null;
    this.copied = '';
  }

  async copy(value) {
    await navigator.clipboard.writeText(value);
    this.copied = value;
    window.setTimeout(() => {
      if (this.copied === value) {
        this.copied = '';
      }
    }, 1200);
  }

  render() {
    const status = this.status || { state: 'offline' };
    const state = status.state || 'offline';
    const label = state === 'online' ? 'Online' : state === 'stale' ? 'Stale heartbeat' : 'Offline';
    const seen = status.receivedAt
      ? `Heartbeat ${formatAge(status.ageMs)}`
      : 'No heartbeat yet. Point DesktopBridge at /api/heartbeat.';
    const b = status.bridge || {};
    const mem = b.memory || {};
    const used =
      typeof mem.totalBytes === 'number' && typeof mem.freeBytes === 'number'
        ? mem.totalBytes - mem.freeBytes
        : null;
    const rows = [
      ['Host', b.hostname],
      ['Public IP', b.publicIp || b.reportedFromIp],
      ['LAN', b.lanPrimary],
      ['Load', Array.isArray(b.loadAverage) ? b.loadAverage.map((n) => Number(n).toFixed(2)).join(' · ') : null],
      ['Memory', used !== null ? `${formatBytes(used)} / ${formatBytes(mem.totalBytes)}` : null],
      ['Uptime', typeof b.uptimeSeconds === 'number' ? `${Math.floor(b.uptimeSeconds / 3600)}h` : null],
    ].filter(([, v]) => v);
    const copyable = new Set(['Host', 'Public IP', 'LAN']);

    return html`
      <jm-card title="Mac">
        <p class="state"><span class="dot ${state}"></span><span>${label}</span></p>
        <p class="muted">${seen}</p>
        <dl class="facts">
          ${rows.flatMap(([k, v]) => {
            const value = String(v);
            return [
              html`<dt>${k}</dt>`,
              html`<dd>
                ${value}${copyable.has(k)
                  ? html`<button class="copy" type="button" @click=${() => this.copy(value)}>
                      ${this.copied === value ? 'copied' : 'copy'}
                    </button>`
                  : ''}
              </dd>`,
            ];
          })}
        </dl>
      </jm-card>
    `;
  }
}

customElements.define('jm-mac', JmMac);
