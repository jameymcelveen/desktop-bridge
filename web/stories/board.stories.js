import { html } from 'lit';
import './story-board.js';
import '../public/components/jm-vin.js';
import '../public/components/jm-links.js';
import '../public/components/jm-weather.js';
import '../public/components/jm-mac.js';
import '../public/components/jm-scratch.js';
import '../public/components/jm-word.js';
import { SAMPLE_LINKS, SAMPLE_STATUS_OFFLINE, SAMPLE_WEATHER } from './fixtures.js';

export default {
  title: 'Board/Layout',
};

export const Default = {
  parameters: { layout: 'fullscreen' },
  render: () => html`
    <div style="padding: 28px 24px; min-width: 960px; box-sizing: border-box;">
      <story-board>
        <jm-vin></jm-vin>
        <jm-links .links=${SAMPLE_LINKS}></jm-links>
        <jm-weather .weather=${SAMPLE_WEATHER}></jm-weather>
        <jm-mac .status=${SAMPLE_STATUS_OFFLINE}></jm-mac>
        <jm-scratch notes=""></jm-scratch>
        <jm-word></jm-word>
      </story-board>
    </div>
  `,
};
