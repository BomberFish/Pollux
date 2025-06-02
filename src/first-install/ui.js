function App() {
  this.micstatus = "unknown";

  this.css = `
    width: 70vw;
    max-width: 800px;
    margin: 0 auto;
    nav {
      display: flex;
      align-items: center;
      gap: 0.8rem;

      img {
        width: 2rem;
        height: 2rem;
      }
    }
  `;

  return html`
    <div class="app">
      <nav>
        <img src="../../res/gemini.png" alt="Gemini Logo" />
        <h1>Pollux</h1>
      </nav>
      <article id="main">
        ${!window.LanguageModel
          ? html`
              <p>
                Your browser does not support the Prompt API. Please use
                <b>Google</b> Chrome 138 or higher. Chromium derivatives like
                Brave or Edge are not supported.
              </p>
            `
          : html`
              <div>
                <p>
                  Pollux is a browser extension that allows you to interact with
                  Gemini Nano directly from your browser. To use the microphone
                  input feature, you need to grant microphone access to the
                  extension.
                </p>

                <button
                  on:click=${() => {
                    if (
                      navigator.mediaDevices &&
                      navigator.mediaDevices.getUserMedia
                    ) {
                      navigator.mediaDevices
                        .getUserMedia({ audio: true })
                        .then((stream) => {
                          this.micstatus = "granted";
                          console.log("Microphone access granted.");
                          for (const track of stream.getTracks()) {
                            track.stop();
                          }
                        })
                        .catch((error) => {
                          console.error("Microphone access denied:", error);
                          this.micstatus = "denied";
                        });
                    } else {
                      console.error(
                        "getUserMedia not supported on this browser.",
                      );
                      this.micstatus = "denied";
                    }
                  }}
                >
                  Request Microphone Access
                </button>
                ${use(this.micstatus, (status) => {
                  switch (status) {
                    case "granted":
                      return html`<p style="color: var(--success)">
                        Microphone access granted. You can now use the
                        microphone input feature.
                      </p>`;
                    case "denied":
                      return html`<p style="color: var(--error)">
                        Microphone access denied. Please check your browser
                        settings.
                      </p>`;
                    default:
                      return html`<div></div>`;
                  }
                })}
              </div>
            `}
      </article>
    </div>
  `;
}

window.addEventListener("load", () => {
  document.body.appendChild(h(App));
});
