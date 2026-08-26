import { LitElement, css, html } from 'lit';

export class JmLogin extends LitElement {
  static properties = {
    error: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      max-width: 26rem;
      margin: 0 auto;
    }
    .panel {
      overflow: hidden;
      background: var(--bg-elev);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      backdrop-filter: blur(18px);
    }
    .cover {
      height: 118px;
      background: #12141a;
    }
    .cover img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: 50% 42%;
    }
    .brand {
      display: flex;
      gap: 0.85rem;
      align-items: flex-end;
      margin: -36px 1.2rem 1.15rem;
      position: relative;
    }
    .avatar {
      width: 72px;
      height: 72px;
      flex-shrink: 0;
      border-radius: 50%;
      object-fit: cover;
      object-position: 50% 12%;
      background: #1a140c;
      border: 3px solid var(--bg);
      box-shadow: 0 0 0 2px var(--accent);
    }
    h1 {
      margin: 0;
      padding-bottom: 2px;
      font-family: Palatino, 'Palatino Linotype', 'Iowan Old Style', Georgia, serif;
      font-size: 1.65rem;
      font-weight: 600;
    }
    .tag,
    .lede {
      color: var(--muted);
    }
    .tag {
      margin: 0.15rem 0 0;
      font-size: 0.85rem;
    }
    .body {
      padding: 0 1.2rem 1.25rem;
    }
    h2 {
      margin: 0 0 0.4rem;
      font-size: 1.1rem;
      text-transform: none;
      letter-spacing: 0;
      color: var(--text);
    }
    .lede {
      margin: 0 0 1.1rem;
    }
    form {
      display: grid;
      gap: 0.85rem;
    }
    label {
      display: grid;
      gap: 0.35rem;
      font-size: 0.85rem;
      color: var(--muted);
    }
    input {
      width: 100%;
      border: 1px solid var(--line);
      background: #0b0c0e;
      color: var(--text);
      border-radius: 10px;
      padding: 0.65rem 0.75rem;
      font: inherit;
    }
    input:focus {
      outline: 2px solid var(--focus);
      outline-offset: 1px;
    }
    button {
      border: 0;
      border-radius: 10px;
      background: var(--accent);
      color: #1a140c;
      font: inherit;
      font-weight: 600;
      padding: 0.7rem 0.9rem;
      cursor: pointer;
    }
    .error {
      margin: 0;
      color: var(--off);
      font-size: 0.9rem;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.9em;
    }
  `;

  constructor() {
    super();
    this.error = '';
  }

  submit(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    this.dispatchEvent(
      new CustomEvent('login', {
        detail: {
          email: String(form.get('email') || ''),
          password: String(form.get('password') || ''),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <section class="panel">
        <div class="cover">
          <img src="/media/cover.jpg" alt="" />
        </div>
        <header class="brand">
          <img
            class="avatar"
            src="/media/avatar.jpg"
            width="72"
            height="72"
            alt="Profile portrait"
          />
          <div>
            <h1>Home</h1>
            <p class="tag">jameymcelveen · @mcelveen.us</p>
          </div>
        </header>
        <div class="body">
          <h2>Sign in</h2>
          <p class="lede">This is the browser start page. Use an <code>@mcelveen.us</code> address.</p>
          <form @submit=${this.submit}>
            <label>
              Email
              <input name="email" type="email" autocomplete="username" required placeholder="you@mcelveen.us" />
            </label>
            <label>
              Password
              <input name="password" type="password" autocomplete="current-password" required />
            </label>
            ${this.error ? html`<p class="error">${this.error}</p>` : ''}
            <button type="submit">Continue</button>
          </form>
        </div>
      </section>
    `;
  }
}

customElements.define('jm-login', JmLogin);
