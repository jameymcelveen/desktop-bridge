import { html } from 'lit';
import '../public/components/jm-card.js';

export default {
  title: 'Widgets/Card',
  component: 'jm-card',
};

export const Empty = {
  render: () => html`<jm-card title="Weather"><p style="color:var(--muted);margin:0">Waiting on the sky…</p></jm-card>`,
};

export const Filled = {
  render: () => html`
    <jm-card title="Weather">
      <div style="font-size:3rem;letter-spacing:-0.06em;font-weight:500">73°</div>
      <div>Overcast</div>
    </jm-card>
  `,
};
