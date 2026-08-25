import { LitElement, css, html } from 'lit';
import { boardStyles } from '../public/lib/board-styles.js';

export class StoryBoard extends LitElement {
  static styles = [
    boardStyles,
    css`
      slot {
        display: contents;
      }
    `,
  ];

  render() {
    return html`<div class="board"><slot></slot></div>`;
  }
}

if (!customElements.get('story-board')) {
  customElements.define('story-board', StoryBoard);
}
