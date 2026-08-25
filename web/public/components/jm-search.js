import { LitElement, css, html } from 'lit';
import { api } from '../lib/api.js';
import { ENGINES, resolveSearch } from '../lib/search.js';

export class JmSearch extends LitElement {
  static properties = {
    engine: { type: String },
    query: { state: true },
    suggestions: { state: true },
    active: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      margin-bottom: 22px;
    }
    .box {
      position: relative;
    }
    input {
      width: 100%;
      font: inherit;
      font-size: 1.15rem;
      padding: 0.95rem 1rem;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: #0b0c0e;
      color: var(--text);
    }
    input:focus {
      outline: 2px solid var(--focus);
      outline-offset: 1px;
    }
    .box.open input {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
    .suggest {
      list-style: none;
      margin: 0;
      padding: 4px 0 6px;
      position: absolute;
      left: 0;
      right: 0;
      z-index: 5;
      background: #12141a;
      border: 1px solid var(--line);
      border-top: 0;
      border-radius: 0 0 14px 14px;
      overflow: hidden;
    }
    .suggest button {
      width: 100%;
      display: block;
      text-align: left;
      background: transparent;
      color: var(--text);
      font: inherit;
      font-weight: 500;
      border: 0;
      border-radius: 0;
      padding: 0.55rem 1rem;
      cursor: pointer;
    }
    .suggest button:hover,
    .suggest button.active {
      background: color-mix(in srgb, var(--accent) 16%, transparent);
    }
    .match {
      color: var(--muted);
      font-weight: 400;
    }
    .engines {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .engines button {
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--line);
      font: inherit;
      font-weight: 500;
      padding: 0.35rem 0.7rem;
      font-size: 0.8rem;
      border-radius: 10px;
      cursor: pointer;
    }
    .engines button.active {
      color: #1a140c;
      background: var(--accent);
      border-color: transparent;
    }
  `;

  constructor() {
    super();
    this.engine = 'google';
    this.query = '';
    this.suggestions = [];
    this.active = -1;
    this._timer = 0;
    this._abort = null;
  }

  focusInput() {
    this.renderRoot.querySelector('input')?.focus();
  }

  pickEngine(id) {
    this.engine = id;
    this.dispatchEvent(
      new CustomEvent('engine-change', { detail: { engine: id }, bubbles: true, composed: true }),
    );
  }

  closeSuggest() {
    this.suggestions = [];
    this.active = -1;
  }

  go(raw) {
    const href = resolveSearch(raw, this.engine);
    if (href) {
      window.location.href = href;
    }
  }

  onSubmit(event) {
    event.preventDefault();
    const chosen = this.active >= 0 ? this.suggestions[this.active] : this.query;
    this.closeSuggest();
    this.go(chosen);
  }

  onInput(event) {
    this.query = event.target.value;
    const q = this.query.trim();
    clearTimeout(this._timer);
    if (!q) {
      this.closeSuggest();
      return;
    }
    this._timer = window.setTimeout(() => {
      void this.fetchSuggest(q);
    }, 80);
  }

  onKey(event) {
    if (event.key === 'Escape') {
      if (this.suggestions.length) {
        event.preventDefault();
        event.stopPropagation();
        this.closeSuggest();
      }
      return;
    }
    if (!this.suggestions.length) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.active = (this.active + 1) % this.suggestions.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.active = this.active <= 0 ? this.suggestions.length - 1 : this.active - 1;
    } else if (event.key === 'Tab' && this.active >= 0) {
      event.preventDefault();
      this.query = this.suggestions[this.active];
      this.closeSuggest();
    }
  }

  async fetchSuggest(q) {
    this._abort?.abort();
    if (!q || /^https?:\/\//i.test(q) || q.startsWith('!')) {
      this.closeSuggest();
      return;
    }
    const ac = new AbortController();
    this._abort = ac;
    try {
      const data = await api(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ac.signal });
      if (this.query.trim() !== q) {
        return;
      }
      this.suggestions = data.suggestions || [];
      this.active = -1;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      this.closeSuggest();
    }
  }

  phraseParts(phrase) {
    const typed = this.query.trim();
    if (typed && phrase.toLowerCase().startsWith(typed.toLowerCase())) {
      return { prefix: typed, rest: phrase.slice(typed.length) };
    }
    return { prefix: phrase, rest: '' };
  }

  render() {
    const open = this.suggestions.length > 0;
    const placeholder =
      this.engine === 'google' ? 'Google search — type for completions' : 'Search or !g !k !d !gh !yt !w !maps';
    return html`
      <form @submit=${this.onSubmit}>
        <div class="box ${open ? 'open' : ''}">
          <input
            type="search"
            name="q"
            .value=${this.query}
            placeholder=${placeholder}
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded=${open ? 'true' : 'false'}
            aria-controls="suggest-list"
            @input=${this.onInput}
            @keydown=${this.onKey}
            @blur=${() => window.setTimeout(() => this.closeSuggest(), 120)}
          />
          ${open
            ? html`
                <ul id="suggest-list" class="suggest" role="listbox">
                  ${this.suggestions.map((phrase, index) => {
                    const parts = this.phraseParts(phrase);
                    return html`
                      <li>
                        <button
                          type="button"
                          role="option"
                          class=${index === this.active ? 'active' : ''}
                          aria-selected=${index === this.active}
                          @mousedown=${(event) => {
                            event.preventDefault();
                            this.go(phrase);
                          }}
                        >
                          ${parts.prefix}${parts.rest ? html`<span class="match">${parts.rest}</span>` : ''}
                        </button>
                      </li>
                    `;
                  })}
                </ul>
              `
            : ''}
        </div>
        <div class="engines">
          ${Object.entries(ENGINES).map(
            ([id, engine]) => html`
              <button
                type="button"
                class=${id === this.engine ? 'active' : ''}
                @click=${() => this.pickEngine(id)}
              >
                ${engine.label}
              </button>
            `,
          )}
        </div>
      </form>
    `;
  }
}

customElements.define('jm-search', JmSearch);
