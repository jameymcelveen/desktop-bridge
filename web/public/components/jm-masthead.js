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
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 22px;
    }
    .hello {
      margin: 0;
      font-size: 1.45rem;
      letter-spacing: -0.02em;
    }
    .date {
      margin: 4px 0 0;
      font-size: 0.95rem;
      color: var(--muted);
    }
    .right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .clock {
      margin: 0 6px 0 0;
      font-variant-numeric: tabular-nums;
      font-size: 2.4rem;
      letter-spacing: -0.04em;
      line-height: 1;
    }
    button {
      width: 40px;
      height: 40px;
      padding: 0;
      border-radius: 10px;
      background: var(--bg-elev);
      color: var(--text);
      border: 1px solid var(--line);
      font: inherit;
      font-size: 1.05rem;
      cursor: pointer;
    }
    button:hover {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    }
    button.ghost {
      background: transparent;
      color: var(--muted);
    }
    @media (max-width: 860px) {
      .clock {
        font-size: 1.8rem;
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
        <div>
          <p class="hello">${greeting(this.name)}</p>
          <p class="date">${this.clock.date}</p>
        </div>
        <div class="right">
          <p class="clock">${this.clock.time}</p>
          <button type="button" title="Settings" @click=${() => this.emit('open-settings')}>⚙</button>
          <button class="ghost" type="button" title="Sign out" @click=${() => this.emit('logout')}>⎋</button>
        </div>
      </header>
    `;
  }
}

customElements.define('jm-masthead', JmMasthead);
