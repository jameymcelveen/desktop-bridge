import { LitElement, css, html } from 'lit';

export class JmCard extends LitElement {
  static properties = {
    title: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .card {
      height: 100%;
      padding: 1.15rem 1.2rem 1.25rem;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--bg-elev);
      backdrop-filter: blur(18px);
    }
    h2 {
      margin: 0 0 14px;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 600;
    }
  `;

  render() {
    return html`
      <section class="card">
        <h2>${this.title}</h2>
        <slot></slot>
      </section>
    `;
  }
}

customElements.define('jm-card', JmCard);
