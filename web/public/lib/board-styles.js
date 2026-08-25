import { css } from 'lit';

/** Shared Home board grid. Keep this as the only placement source so widgets cannot overlap. */
export const boardStyles = css`
  .board {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
    align-items: stretch;
  }
  .board > * {
    min-width: 0;
  }
  .board > jm-vin,
  .board > jm-links {
    grid-column: 1 / -1;
  }
  .board > jm-scratch {
    grid-column: 1 / 3;
  }
  @media (max-width: 860px) {
    .board {
      grid-template-columns: minmax(0, 1fr);
    }
    .board > jm-vin,
    .board > jm-links,
    .board > jm-scratch {
      grid-column: auto;
    }
  }
`;
