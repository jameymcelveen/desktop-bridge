import { LitElement, css, html } from 'lit';

export class JmSettings extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    email: { type: String },
    home: { type: Object },
    message: { state: true },
    copied: { state: true },
  };

  static styles = css`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: none;
      z-index: 20;
    }
    aside {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: min(420px, 100vw);
      background: #12141a;
      border-left: 1px solid var(--line);
      padding: 24px;
      overflow: auto;
      transform: translateX(100%);
      transition: transform 160ms ease;
      z-index: 21;
    }
    :host {
      display: block;
      pointer-events: none;
    }
    :host([open]) {
      pointer-events: auto;
    }
    :host([open]) .backdrop {
      display: block;
    }
    :host([open]) aside {
      transform: none;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 1.2rem;
    }
    h3 {
      margin: 1.5rem 0 0.5rem;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    p,
    li {
      color: var(--muted);
      font-size: 0.92rem;
    }
    label {
      display: grid;
      gap: 0.35rem;
      margin-top: 10px;
      font-size: 0.85rem;
      color: var(--muted);
    }
    input,
    textarea,
    select {
      width: 100%;
      border: 1px solid var(--line);
      background: #0b0c0e;
      color: var(--text);
      border-radius: 10px;
      padding: 0.65rem 0.75rem;
      font: inherit;
    }
    textarea {
      min-height: 160px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.85rem;
    }
    .row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 10px;
    }
    button {
      border: 0;
      border-radius: 10px;
      background: var(--accent);
      color: #1a140c;
      font: inherit;
      font-weight: 600;
      padding: 0.7rem 0.9rem;
      cursor: pointer;
    }
    button.ghost {
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--line);
      font-weight: 500;
    }
    .howto {
      padding-left: 1.1rem;
    }
    .flash {
      color: var(--ok);
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.9em;
    }
    a {
      color: var(--accent);
    }
  `;

  constructor() {
    super();
    this.open = false;
    this.email = '';
    this.home = {};
    this.message = '';
    this.copied = false;
  }

  close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  async copyUrl() {
    await navigator.clipboard.writeText('https://home.jameymcelveen.com');
    this.copied = true;
    window.setTimeout(() => {
      this.copied = false;
    }, 1400);
  }

  save() {
    const displayName = this.renderRoot.querySelector('#displayName').value.trim();
    const searchEngine = this.renderRoot.querySelector('#searchEngine').value;
    let links;
    try {
      links = JSON.parse(this.renderRoot.querySelector('#links').value || '[]');
    } catch {
      this.message = 'Links JSON is invalid.';
      return;
    }
    this.message = '';
    this.dispatchEvent(
      new CustomEvent('save', {
        detail: { displayName, searchEngine, links },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const home = this.home || {};
    return html`
      <div class="backdrop" @click=${this.close}></div>
      <aside aria-label="Settings" ?inert=${!this.open} aria-hidden=${this.open ? 'false' : 'true'}>
        <h2>Settings</h2>
        <p>Signed in as ${this.email}</p>
        <label>
          Display name
          <input id="displayName" maxlength="80" .value=${home.displayName || ''} />
        </label>
        <label>
          Search engine
          <select id="searchEngine" .value=${home.searchEngine || 'google'}>
            <option value="google">Google</option>
            <option value="kagi">Kagi</option>
            <option value="ddg">DuckDuckGo</option>
          </select>
        </label>
        <label>
          Links JSON
          <textarea id="links" spellcheck="false" .value=${JSON.stringify(home.links || [], null, 2)}></textarea>
        </label>
        <div class="row">
          <button type="button" @click=${() => this.save()}>Save</button>
          <button class="ghost" type="button" @click=${() => this.close()}>Close</button>
          ${this.message ? html`<span class="flash">${this.message}</span>` : ''}
        </div>
        <h3>Make this the homepage</h3>
        <p>Browsers will not let a page set itself. Copy the URL, then:</p>
        <ul class="howto">
          <li><strong>Chrome:</strong> chrome://settings/onStartup → Open a specific page → Add <code>https://home.jameymcelveen.com</code></li>
          <li><strong>Safari:</strong> Settings → General → Homepage → the same URL. New windows / new tabs can also open it.</li>
          <li><strong>Firefox:</strong> about:preferences#home → Homepage and new windows</li>
        </ul>
        <div class="row">
          <button class="ghost" type="button" @click=${() => this.copyUrl()}>${this.copied ? 'Copied' : 'Copy URL'}</button>
        </div>
        <h3>Component library</h3>
        <p><a href="/storybook/" target="_blank" rel="noopener">Storybook</a> — jm-* widgets, isolated. Same origin as Home.</p>
      </aside>
    `;
  }
}

customElements.define('jm-settings', JmSettings);
