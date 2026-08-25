import { html } from 'lit';
import '../public/components/jm-scratch.js';
import '../public/components/jm-word.js';
import '../public/components/jm-login.js';
import '../public/components/jm-search.js';
import '../public/components/jm-masthead.js';
import '../public/components/jm-vin.js';
import '../public/components/jm-settings.js';

export default {
  title: 'Widgets/Other',
};

export const Scratch = {
  render: () => html`<jm-scratch notes="Lot notes. Autosaves."></jm-scratch>`,
};

export const Word = {
  render: () => html`<jm-word></jm-word>`,
};

export const Login = {
  render: () => html`<jm-login></jm-login>`,
};

export const Search = {
  render: () => html`<jm-search engine="google"></jm-search>`,
};

export const Masthead = {
  render: () => html`<jm-masthead name="Jamey"></jm-masthead>`,
};

export const VinSweep = {
  render: () => html`<jm-vin></jm-vin>`,
};

export const SettingsOpen = {
  render: () => html`<jm-settings open email="jamey@mcelveen.us" .home=${{ displayName: 'Jamey', searchEngine: 'google', links: [] }}></jm-settings>`,
};
