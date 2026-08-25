import { html } from 'lit';
import '../public/components/jm-mac.js';
import { SAMPLE_STATUS_OFFLINE, SAMPLE_STATUS_ONLINE } from './fixtures.js';

export default {
  title: 'Widgets/Mac',
  component: 'jm-mac',
};

export const Offline = {
  render: () => html`<jm-mac .status=${SAMPLE_STATUS_OFFLINE}></jm-mac>`,
};

export const Online = {
  render: () => html`<jm-mac .status=${SAMPLE_STATUS_ONLINE}></jm-mac>`,
};
