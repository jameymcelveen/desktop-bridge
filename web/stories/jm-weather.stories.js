import { html } from 'lit';
import '../public/components/jm-weather.js';
import { SAMPLE_WEATHER } from './fixtures.js';

export default {
  title: 'Widgets/Weather',
  component: 'jm-weather',
};

export const Loading = {
  render: () => html`<jm-weather></jm-weather>`,
};

export const Florence = {
  render: () => html`<jm-weather .weather=${SAMPLE_WEATHER}></jm-weather>`,
};
