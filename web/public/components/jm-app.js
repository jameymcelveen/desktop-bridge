import { LitElement, css, html } from 'lit';
import { api } from '../lib/api.js';
import './jm-login.js';
import './jm-masthead.js';
import './jm-search.js';
import './jm-links.js';
import './jm-weather.js';
import './jm-mac.js';
import './jm-scratch.js';
import './jm-word.js';
import './jm-vin.js';
import './jm-settings.js';

export class JmApp extends LitElement {
  static properties = {
    email: { state: true },
    home: { state: true },
    weather: { state: true },
    status: { state: true },
    settingsOpen: { state: true },
    loginError: { state: true },
    ready: { state: true },
  };

  static styles = css`
    :host {
      display: block;
    }
    .shell {
      max-width: 1120px;
      margin: 0 auto;
      padding: 28px 24px 64px;
    }
    .board {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 860px) {
      .shell {
        padding: 20px 16px 48px;
      }
      .board {
        grid-template-columns: 1fr;
      }
    }
  `;

  constructor() {
    super();
    this.email = '';
    this.home = { displayName: 'Jamey', searchEngine: 'google', notes: '', links: [] };
    this.weather = null;
    this.status = null;
    this.settingsOpen = false;
    this.loginError = '';
    this.ready = false;
    this._statusTimer = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.onKey);
    void this.boot();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.onKey);
    clearInterval(this._statusTimer);
  }

  onKey = (event) => {
    if (event.key === 'Escape') {
      this.settingsOpen = false;
      return;
    }
    const path = event.composedPath();
    const typing = path.some((node) => node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement);
    if (!typing && (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key === 'k'))) {
      event.preventDefault();
      this.renderRoot.querySelector('jm-search')?.focusInput();
    }
  };

  async boot() {
    try {
      const me = await api('/api/me');
      await this.enter(me.email);
    } catch {
      this.ready = true;
    }
  }

  async enter(email) {
    this.email = email;
    this.loginError = '';
    this.home = await api('/api/home');
    this.ready = true;
    await Promise.all([
      this.refreshStatus().catch(() => undefined),
      api('/api/weather')
        .then((weather) => {
          this.weather = weather;
        })
        .catch(() => {
          this.weather = null;
        }),
    ]);
    this.updateComplete.then(() => this.renderRoot.querySelector('jm-search')?.focusInput());
    clearInterval(this._statusTimer);
    this._statusTimer = window.setInterval(() => {
      void this.refreshStatus().catch(() => undefined);
    }, 10_000);
  }

  async refreshStatus() {
    this.status = await api('/api/status');
  }

  async onLogin(event) {
    this.loginError = '';
    try {
      const me = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify(event.detail),
      });
      await this.enter(me.email);
    } catch (err) {
      this.loginError = err instanceof Error ? err.message : 'Sign-in failed';
    }
  }

  async logout() {
    await api('/api/logout', { method: 'POST' });
    window.location.reload();
  }

  async saveHome(patch) {
    this.home = await api('/api/home', { method: 'PUT', body: JSON.stringify(patch) });
    return this.home;
  }

  async onEngine(event) {
    await this.saveHome({ searchEngine: event.detail.engine });
  }

  async onNotes(event) {
    const scratch = this.renderRoot.querySelector('jm-scratch');
    try {
      await this.saveHome({ notes: event.detail.notes });
      if (scratch) {
        scratch.status = 'Saved';
      }
    } catch {
      if (scratch) {
        scratch.status = 'Save failed';
      }
    }
  }

  async onSettingsSave(event) {
    const panel = this.renderRoot.querySelector('jm-settings');
    try {
      await this.saveHome(event.detail);
      if (panel) {
        panel.message = 'Saved.';
      }
    } catch (err) {
      if (panel) {
        panel.message = err instanceof Error ? err.message : 'Save failed';
      }
    }
  }

  render() {
    if (!this.ready) {
      return html`<div class="shell"></div>`;
    }
    if (!this.email) {
      return html`
        <div class="shell">
          <jm-login .error=${this.loginError} @login=${this.onLogin}></jm-login>
        </div>
      `;
    }
    return html`
      <div class="shell">
        <jm-masthead
          .name=${this.home.displayName}
          @open-settings=${() => {
            this.settingsOpen = true;
          }}
          @logout=${this.logout}
        ></jm-masthead>
        <jm-search .engine=${this.home.searchEngine} @engine-change=${this.onEngine}></jm-search>
        <div class="board">
          <jm-vin></jm-vin>
          <jm-links .links=${this.home.links}></jm-links>
          <jm-weather .weather=${this.weather}></jm-weather>
          <jm-mac .status=${this.status}></jm-mac>
          <jm-scratch .notes=${this.home.notes} @notes-change=${this.onNotes}></jm-scratch>
          <jm-word></jm-word>
        </div>
      </div>
      <jm-settings
        .open=${this.settingsOpen}
        .email=${this.email}
        .home=${this.home}
        @close=${() => {
          this.settingsOpen = false;
        }}
        @save=${this.onSettingsSave}
      ></jm-settings>
    `;
  }
}

customElements.define('jm-app', JmApp);
