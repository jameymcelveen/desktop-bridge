import '../public/styles.css';

/** @type { import('@storybook/web-components').Preview } */
const preview = {
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'home',
      values: [{ name: 'home', value: '#0b0c0e' }],
    },
    options: {
      storySort: {
        order: ['Board', 'Widgets'],
      },
    },
  },
};

export default preview;
