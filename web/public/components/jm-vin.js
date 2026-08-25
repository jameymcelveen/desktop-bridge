import { LitElement, css, html } from 'lit';
import './jm-card.js';
import {
  TAPS,
  complaintRows,
  formatSweepText,
  loadState,
  modelYearFromVin,
  normalizeVin,
  recallRows,
  rememberSweep,
  saveState,
  setTap,
  shortSummary,
  specFromDecode,
  topComplaintComponents,
  validateVin,
} from '../lib/vin.js';

const DECODE_URL = (vin) => `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`;
const RECALLS_URL = (spec) =>
  `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(spec.make)}&model=${encodeURIComponent(spec.model)}&modelYear=${encodeURIComponent(spec.year)}`;
const COMPLAINTS_URL = (spec) =>
  `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${encodeURIComponent(spec.make)}&model=${encodeURIComponent(spec.model)}&modelYear=${encodeURIComponent(spec.year)}`;

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export class JmVin extends LitElement {
  static properties = {
    vin: { state: true },
    errors: { state: true },
    spec: { state: true },
    specStatus: { state: true },
    recalls: { state: true },
    recallStatus: { state: true },
    complaints: { state: true },
    complaintStatus: { state: true },
    copied: { state: true },
    store: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      grid-column: 1 / -1;
    }
    form {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: stretch;
    }
    input {
      flex: 1 1 12rem;
      min-width: 0;
      font: inherit;
      font-size: 16px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.75rem 0.85rem;
      min-height: 44px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: #0b0c0e;
      color: var(--text);
    }
    input:focus {
      outline: 2px solid var(--focus);
      outline-offset: 1px;
    }
    .hint {
      display: grid;
      place-items: center;
      min-height: 44px;
      padding: 0 0.7rem;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
      font-size: 0.9rem;
    }
    button {
      min-height: 44px;
      min-width: 44px;
      padding: 0.7rem 1rem;
      border: 0;
      border-radius: 10px;
      background: var(--accent);
      color: #1a140c;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    button.ghost {
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--line);
      font-weight: 500;
    }
    .errors {
      margin: 8px 0 0;
      color: var(--off);
      font-size: 0.9rem;
    }
    .errors p {
      margin: 0.2rem 0 0;
    }
    .block {
      margin-top: 16px;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 600;
    }
    .badge {
      letter-spacing: 0;
      text-transform: none;
      font-size: 0.75rem;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      border: 1px solid var(--line);
      color: var(--text);
    }
    .badge.ok {
      color: var(--ok);
      border-color: color-mix(in srgb, var(--ok) 45%, var(--line));
    }
    .title {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0 0 8px;
    }
    .facts {
      display: grid;
      gap: 6px;
    }
    .fact {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.92rem;
    }
    .fact dt {
      color: var(--muted);
    }
    .fact dd {
      margin: 0;
      text-align: right;
    }
    .fact.hot dd {
      color: #1a140c;
      background: var(--accent);
      padding: 0.1rem 0.45rem;
      border-radius: 8px;
      font-weight: 600;
    }
    .muted {
      color: var(--muted);
      margin: 0;
      font-size: 0.9rem;
    }
    .fail {
      color: var(--off);
      margin: 0;
      font-size: 0.9rem;
    }
    .okline {
      color: var(--ok);
      margin: 0;
    }
    .recalls {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }
    .recalls li {
      font-size: 0.92rem;
      line-height: 1.35;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0.35rem 0.7rem;
      font-size: 0.85rem;
      min-height: 36px;
      display: grid;
      place-items: center;
    }
    .taps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
    }
    .taps label {
      display: grid;
      grid-template-columns: 1.4rem 1fr;
      gap: 8px 10px;
      align-items: start;
      min-height: 44px;
      cursor: pointer;
    }
    .taps input {
      width: 1.15rem;
      height: 1.15rem;
      min-height: 0;
      margin-top: 0.2rem;
      accent-color: var(--accent);
      letter-spacing: 0;
    }
    .taps a {
      color: var(--accent);
    }
    .taps small {
      display: block;
      grid-column: 2;
      color: var(--muted);
      font-size: 0.85rem;
    }
    .history {
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .history button {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--line);
      font-weight: 500;
      font-size: 0.8rem;
      padding: 0.45rem 0.65rem;
    }
    .copy {
      margin-top: 12px;
    }
    .skel {
      height: 0.7rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--text) 8%, transparent);
      animation: pulse 1.1s ease-in-out infinite;
    }
    .skel + .skel {
      margin-top: 8px;
      width: 70%;
    }
    @keyframes pulse {
      50% {
        opacity: 0.45;
      }
    }
    @media (max-width: 860px) {
      :host {
        grid-column: auto;
      }
    }
  `;

  constructor() {
    super();
    this.vin = '';
    this.errors = [];
    this.spec = null;
    this.specStatus = '';
    this.recalls = null;
    this.recallStatus = '';
    this.complaints = null;
    this.complaintStatus = '';
    this.copied = false;
    this.store = loadState(window.localStorage);
  }

  get yearHint() {
    return modelYearFromVin(this.vin);
  }

  persist(next) {
    this.store = next;
    saveState(window.localStorage, next);
  }

  onInput(event) {
    this.vin = normalizeVin(event.target.value).slice(0, 17);
    this.errors = [];
  }

  onSubmit(event) {
    event.preventDefault();
    void this.sweep(this.vin);
  }

  async sweep(raw) {
    const checked = validateVin(raw);
    this.vin = checked.vin;
    this.errors = checked.errors;
    if (!checked.ok) {
      return;
    }
    this.spec = null;
    this.recalls = null;
    this.complaints = null;
    this.specStatus = 'loading';
    this.recallStatus = '';
    this.complaintStatus = '';
    let spec;
    try {
      spec = specFromDecode(await getJson(DECODE_URL(checked.vin)));
      this.spec = spec;
      this.specStatus = 'ok';
      this.persist(
        rememberSweep(this.store, {
          vin: checked.vin,
          year: spec.year,
          make: spec.make,
          model: spec.model,
          trim: spec.trim,
        }),
      );
    } catch {
      this.specStatus = 'NHTSA decode unreachable — retry';
      return;
    }
    this.recallStatus = 'loading';
    this.complaintStatus = 'loading';
    const [recalls, complaints] = await Promise.all([
      getJson(RECALLS_URL(spec))
        .then((data) => {
          this.recalls = recallRows(data);
          this.recallStatus = 'ok';
        })
        .catch(() => {
          this.recallStatus = 'NHTSA recalls unreachable — retry';
        }),
      getJson(COMPLAINTS_URL(spec))
        .then((data) => {
          this.complaints = complaintRows(data);
          this.complaintStatus = 'ok';
        })
        .catch(() => {
          this.complaintStatus = 'NHTSA complaints unreachable — retry';
        }),
    ]);
    void recalls;
    void complaints;
  }

  toggleTap(id, checked) {
    if (!this.spec) {
      return;
    }
    this.persist(setTap(this.store, this.vin, id, checked));
  }

  async copy() {
    const taps = this.store.taps[this.vin] || {};
    const text = formatSweepText({
      vin: this.vin,
      spec: this.spec,
      recalls: this.recalls,
      complaints: this.complaints,
      taps,
    });
    await navigator.clipboard.writeText(text);
    this.copied = true;
    window.setTimeout(() => {
      this.copied = false;
    }, 1400);
  }

  renderSpec() {
    if (this.specStatus === 'loading') {
      return html`<div class="block"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>`;
    }
    if (this.specStatus && this.specStatus !== 'ok') {
      return html`<div class="block"><p class="fail">${this.specStatus}</p></div>`;
    }
    const spec = this.spec;
    if (!spec) {
      return '';
    }
    const facts = [
      ['Drive', spec.drive, true],
      ['Trim', spec.trim, true],
      ['Body', spec.body, false],
      ['Engine', [spec.cylinders && `${spec.cylinders} cyl`, spec.displacement].filter(Boolean).join(' · '), false],
      ['Fuel', spec.fuel, false],
      ['Plant', [spec.plantCity, spec.plantCountry].filter(Boolean).join(', '), false],
    ];
    return html`
      <div class="block">
        <p class="title">${spec.year} ${spec.make} ${spec.model}</p>
        <dl class="facts">
          ${facts.map(
            ([label, value, hot]) => html`
              <div class="fact ${hot ? 'hot' : ''}">
                <dt>${label}</dt>
                <dd>${value || '—'}</dd>
              </div>
            `,
          )}
        </dl>
      </div>
    `;
  }

  renderRecalls() {
    if (!this.spec && this.specStatus !== 'loading') {
      return '';
    }
    if (this.recallStatus === 'loading') {
      return html`<div class="block"><div class="head">Recalls</div><div class="skel"></div><div class="skel"></div></div>`;
    }
    if (this.recallStatus && this.recallStatus !== 'ok') {
      return html`<div class="block"><div class="head">Recalls</div><p class="fail">${this.recallStatus}</p></div>`;
    }
    if (!this.recalls) {
      return '';
    }
    if (!this.recalls.length) {
      return html`<div class="block"><div class="head">Recalls</div><p class="okline">no open recalls</p></div>`;
    }
    return html`
      <div class="block">
        <div class="head">Recalls <span class="badge">${this.recalls.length}</span></div>
        <ul class="recalls">
          ${this.recalls.map(
            (row) => html`<li><strong>${row.Component || 'Unknown'}</strong> — ${shortSummary(row.Summary)}</li>`,
          )}
        </ul>
      </div>
    `;
  }

  renderComplaints() {
    if (!this.spec && this.specStatus !== 'loading') {
      return '';
    }
    if (this.complaintStatus === 'loading') {
      return html`<div class="block"><div class="head">Complaints</div><div class="skel"></div></div>`;
    }
    if (this.complaintStatus && this.complaintStatus !== 'ok') {
      return html`<div class="block"><div class="head">Complaints</div><p class="fail">${this.complaintStatus}</p></div>`;
    }
    if (!this.complaints) {
      return '';
    }
    const top = topComplaintComponents(this.complaints);
    return html`
      <div class="block">
        <div class="head">Complaints <span class="badge">${this.complaints.length}</span></div>
        ${top.length
          ? html`<div class="chips">${top.map((row) => html`<span class="chip">${row.name} (${row.count})</span>`)}</div>`
          : html`<p class="muted">No complaint pattern yet.</p>`}
      </div>
    `;
  }

  renderTaps() {
    if (!this.spec) {
      return '';
    }
    const taps = this.store.taps[this.vin] || {};
    return html`
      <div class="block">
        <div class="head">Your taps</div>
        <ul class="taps">
          ${TAPS.map(
            (tap) => html`
              <li>
                <label>
                  <input
                    type="checkbox"
                    .checked=${!!taps[tap.id]}
                    @change=${(event) => this.toggleTap(tap.id, event.target.checked)}
                  />
                  <span>
                    <a href=${tap.href(this.vin)} target="_blank" rel="noopener noreferrer">${tap.label}</a>
                  </span>
                  <small>${tap.hint}</small>
                </label>
              </li>
            `,
          )}
        </ul>
        <div class="copy">
          <button class="ghost" type="button" @click=${() => this.copy()}>${this.copied ? 'Copied' : 'Copy sweep'}</button>
        </div>
      </div>
    `;
  }

  renderHistory() {
    if (!this.store.history.length) {
      return '';
    }
    return html`
      <div class="block">
        <div class="head">Recent</div>
        <ul class="history">
          ${this.store.history.map(
            (row) => html`
              <li>
                <button type="button" @click=${() => this.sweep(row.vin)}>
                  ${row.year} ${row.make} ${row.model} · ${row.vin.slice(-6)}
                </button>
              </li>
            `,
          )}
        </ul>
      </div>
    `;
  }

  render() {
    return html`
      <jm-card title="VIN Sweep">
        <form @submit=${this.onSubmit}>
          <input
            name="vin"
            maxlength="17"
            inputmode="text"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            placeholder="17-character VIN"
            .value=${this.vin}
            @input=${this.onInput}
          />
          <span class="hint">${this.yearHint ?? 'year'}</span>
          <button type="submit">Sweep</button>
        </form>
        ${this.errors.length
          ? html`<div class="errors">${this.errors.map((err) => html`<p>${err}</p>`)}</div>`
          : ''}
        ${this.renderSpec()}
        ${this.renderRecalls()}
        ${this.renderComplaints()}
        ${this.renderTaps()}
        ${this.renderHistory()}
      </jm-card>
    `;
  }
}

customElements.define('jm-vin', JmVin);
