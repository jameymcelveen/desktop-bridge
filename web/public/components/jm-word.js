import { LitElement, css, html } from 'lit';
import { verseForDay } from '../lib/word.js';
import './jm-card.js';

export class JmWord extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    blockquote {
      margin: 0;
      font-family: Palatino, 'Palatino Linotype', 'Iowan Old Style', Georgia, serif;
      font-size: 1.15rem;
      line-height: 1.45;
    }
    cite {
      display: block;
      margin-top: 0.85rem;
      font-style: normal;
      font-family: var(--font);
      font-size: 0.8rem;
      color: var(--muted);
      letter-spacing: 0.04em;
    }
  `;

  render() {
    const verse = verseForDay();
    return html`
      <jm-card title="Word">
        <blockquote>“${verse.text}”<cite>${verse.ref}</cite></blockquote>
      </jm-card>
    `;
  }
}

customElements.define('jm-word', JmWord);
