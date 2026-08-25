import { LitElement, css, html } from 'lit';
import './jm-card.js';

export class JmWeather extends LitElement {
  static properties = {
    weather: { type: Object },
  };

  static styles = css`
    :host {
      display: block;
    }
    .temp {
      font-size: 3.4rem;
      letter-spacing: -0.06em;
      line-height: 0.95;
      font-weight: 500;
    }
    .condition {
      font-size: 1.1rem;
      margin-top: 6px;
    }
    .muted,
    .row {
      color: var(--muted);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-top: 16px;
      font-size: 0.92rem;
    }
  `;

  render() {
    const w = this.weather;
    if (!w || typeof w.temperature !== 'number') {
      return html`<jm-card title="Weather"><p class="muted">Waiting on the sky…</p></jm-card>`;
    }
    const unit = String(w.units?.temperature ?? '°F').replace('°F', '°');
    return html`
      <jm-card title="Weather">
        <div class="temp">${Math.round(w.temperature)}${unit}</div>
        <div class="condition">${w.label ?? ''}</div>
        <div class="muted">${w.place ?? ''}</div>
        <div class="row">
          <span>H ${Math.round(w.high ?? w.temperature)}${unit}</span>
          <span>L ${Math.round(w.low ?? w.temperature)}${unit}</span>
          <span>${Math.round(w.wind ?? 0)} ${w.units?.wind ?? 'mph'}</span>
        </div>
      </jm-card>
    `;
  }
}

customElements.define('jm-weather', JmWeather);
