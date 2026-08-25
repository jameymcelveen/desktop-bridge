import { html } from 'lit';
import '../public/components/jm-links.js';
import { SAMPLE_LINKS } from './fixtures.js';

export default {
  title: 'Widgets/Links',
  component: 'jm-links',
};

export const Grid = {
  render: () => html`<jm-links .links=${SAMPLE_LINKS}></jm-links>`,
};
