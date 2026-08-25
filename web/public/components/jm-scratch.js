import { LitElement, css, html } from 'lit';
import './jm-card.js';

export class JmScratch extends LitElement {
  static properties = {
    notes: { type: String },
    status: { type: String },
  };

  static styles = css`
    :host {
      display: block;
    }
    textarea {
      width: 100%;
      min-height: 11rem;
      resize: vertical;
      background: transparent;
      border: 0;
      padding: 0;
      color: var(--text);
      font: inherit;
      font-size: 0.95rem;
    }
    textarea:focus {
      outline: none;
    }
    .muted {
      color: var(--muted);
      margin: 0.5rem 0 0;
      font-size: 0.85rem;
    }
  `;

  constructor() {
    super();
    this.notes = '';
    this.status = '';
    this._timer = 0;
  }

  onInput(event) {
    this.notes = event.target.value;
    this.status = 'Saving…';
    clearTimeout(this._timer);
    this._timer = window.setTimeout(() => {
      this.dispatchEvent(
        new CustomEvent('notes-change', {
          detail: { notes: this.notes },
          bubbles: true,
          composed: true,
        }),
      );
    }, 600);
  }

  render() {
    return html`
      <jm-card title="Scratch">
        <textarea
          .value=${this.notes}
          placeholder="Dump it here. Scraps, URLs, the next widget idea. Autosaves."
          @input=${this.onInput}
        ></textarea>
        ${this.status ? html`<p class="muted">${this.status}</p>` : ''}
      </jm-card>
    `;
  }
}

customElements.define('jm-scratch', JmScratch);
