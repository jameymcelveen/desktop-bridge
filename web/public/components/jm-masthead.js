import { LitElement, css, html } from 'lit';
import { clockParts, greeting } from '../lib/clock.js';

export class JmMasthead extends LitElement {
  static properties = {
    name: { type: String },
    clock: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      margin-bottom: 8px;
    }
    .cover {
      position: relative;
      height: clamp(168px, 28vw, 280px);
      overflow: hidden;
      background: #12141a;
    }
    .cover img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: 50% 42%;
    }
    .cover::after {
      content: '';
      position: absolute;
      inset: auto 0 0;
      height: 72px;
      background: linear-gradient(transparent, var(--bg));
      pointer-events: none;
    }
    .tools {
      position: absolute;
      z-index: 1;
      top: 14px;
      right: max(14px, calc((100% - 1120px) / 2 + 24px));
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 8px 7px 14px;
      border-radius: 14px;
      background: rgba(11, 12, 14, 0.58);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(16px);
    }
    .clock {
      margin: 0 4px 0 0;
      font-variant-numeric: tabular-nums;
      font-size: 1.85rem;
      letter-spacing: -0.04em;
      line-height: 1;
    }
    button,
    a.lib {
      width: 36px;
      height: 36px;
      padding: 0;
      border-radius: 10px;
      background: rgba(22, 24, 28, 0.72);
      color: var(--text);
      border: 1px solid var(--line);
      font: inherit;
      cursor: pointer;
    }
    button:hover,
    a.lib:hover {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    }
    a.lib {
      display: grid;
      place-items: center;
      text-decoration: none;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .identity {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-end;
      gap: 16px;
      max-width: 1120px;
      margin: -64px auto 0;
      padding: 0 24px 4px;
    }
    .avatar {
      width: 128px;
      height: 128px;
      flex-shrink: 0;
      border-radius: 50%;
      object-fit: cover;
      object-position: 50% 12%;
      background: #1a140c;
      border: 4px solid var(--bg);
      box-shadow: 0 0 0 2px var(--accent);
    }
    .who {
      min-width: 0;
      padding-bottom: 10px;
    }
    .hello {
      margin: 0;
      font-size: 1.45rem;
      letter-spacing: -0.02em;
    }
    .date,
    .clock-inline {
      margin: 4px 0 0;
      font-size: 0.95rem;
      color: var(--muted);
    }
    .clock-inline {
      display: none;
      font-variant-numeric: tabular-nums;
    }
    @media (max-width: 860px) {
      .identity {
        margin-top: -48px;
        padding: 0 16px 4px;
        gap: 12px;
      }
      .avatar {
        width: 96px;
        height: 96px;
        border-width: 3px;
      }
      .hello {
        font-size: 1.2rem;
      }
      .tools .clock {
        display: none;
      }
      .clock-inline {
        display: block;
      }
      .tools {
        right: 10px;
        top: 10px;
        padding: 5px;
        gap: 6px;
      }
      button,
      a.lib {
        width: 32px;
        height: 32px;
      }
    }
  `;

  constructor() {
    super();
    this.name = '';
    this.clock = clockParts();
    this._timer = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this._timer = window.setInterval(() => {
      this.clock = clockParts();
    }, 15_000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  emit(name) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <header>
        <div class="cover">
          <img src="/media/cover.jpg" alt="" />
          <div class="tools">
            <p class="clock">${this.clock.time}</p>
            <a class="lib" href="/storybook/" title="Component library">SB</a>
            <button type="button" title="Settings" @click=${() => this.emit('open-settings')}>⚙</button>
            <button type="button" title="Sign out" @click=${() => this.emit('logout')}>⎋</button>
          </div>
        </div>
        <div class="identity">
          <img
            class="avatar"
            src="/media/avatar.jpg"
            width="128"
            height="128"
            alt="Profile portrait"
          />
          <div class="who">
            <p class="hello">${greeting(this.name)}</p>
            <p class="date">${this.clock.date}</p>
            <p class="clock-inline">${this.clock.time}</p>
          </div>
        </div>
      </header>
    `;
  }
}

customElements.define('jm-masthead', JmMasthead);
