import { LitElement, css, html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { iconSvg } from '../icons.js';
import './jm-card.js';

export class JmLinks extends LitElement {
  static properties = {
    links: { type: Array },
  };

  static styles = css`
    :host {
      display: block;
      grid-column: 1 / -1;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
      gap: 12px;
    }
    a {
      color: inherit;
      text-decoration: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 4px;
    }
    .tile {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--line);
    }
    .tile :first-child {
      width: 24px;
      height: 24px;
    }
    a:hover .tile {
      border-color: color-mix(in srgb, var(--accent) 50%, var(--line));
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }
    .label {
      font-size: 0.75rem;
      color: var(--muted);
      max-width: 88px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media (max-width: 860px) {
      :host {
        grid-column: auto;
      }
    }
  `;

  constructor() {
    super();
    this.links = [];
  }

  render() {
    return html`
      <jm-card title="Links">
        <div class="grid">
          ${(this.links ?? []).map(
            (link) => html`
              <a href=${link.url} rel="noopener noreferrer" title=${link.title}>
                <span class="tile">${unsafeHTML(iconSvg(link.icon))}</span>
                <span class="label">${link.title}</span>
              </a>
            `,
          )}
        </div>
      </jm-card>
    `;
  }
}

customElements.define('jm-links', JmLinks);
