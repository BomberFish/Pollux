function App() {
  this.lm = undefined;
  this.messages = [{ type: "info", message: "Preparing model..." }];
  this.prompt = "";
  this.sendDisabled = true;

  this.mount = async () => {
    try {
      this.lm = await LanguageModel.create({
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            console.log(`Downloaded ${e.loaded * 100}%`);
            if (0 < e.loaded && e.loaded < 1) {
              this.messages = [
                ...this.messages,
                `Downloading model: ${Math.round(e.loaded * 100)}%`,
              ];
            }
          });
        },
        initialPrompts: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Do not use Markdown to format your responses.",
          }, // TODO: Add Markdown support
        ],
      });
      console.log("lm:", this.lm);
      // this.messages = [...this.messages, "Model ready!"];
      this.messages = [
        ...this.messages,
        { type: "info", message: "Model ready!" },
      ];
      this.sendDisabled = false;
    } catch (error) {
      this.messages = [
        ...this.messages,
        { type: "error", message: "Failed to load model: " + error },
      ];
      console.error(error);
    }
  };

  useChange(this.messages, () => {
    console.log("messages changed:", this.messages);
  });

  this.css = `
    background-color: var(--bg);
    color: var(--fg);
    max-width: 100%;
    height: 100vh;
    padding: 1.25em;
    margin: 0;
    overflow: hidden;

    .message {
      padding: 1em;
      margin: 0.8em 0;
      border-radius: 1em;
      background-color: var(--fill-primary);
      min-width: min-content;
      max-width: min(max(80%, 20em), 100%);
      line-height: 1.4;
      white-space: pre-line;
    }

    .message.user {
      margin-left: auto;
      background-color: var(--fill-accent);
      border-bottom-right-radius: 0.3em;
    }

    .message.assistant {
      margin-right: auto;
      border-bottom-left-radius: 0.3em;
    }

    .message.info,
    .message.error {
      background-color: transparent;
      padding: 0;
      color: var(--fg-secondary);
    }

    .message.error {
      color: var(--error);
    }

    .messages {
      height: calc(100vh - 5.4em);
      overflow-y: auto;
    }

    .input {
      display: flex;
      gap: 0.75em;
      height: 3em;
    }

    input {
      flex: 1;
      appearance: none;
      border: 1px solid var(--fill-secondary);
      border-radius: 0.5em;
      padding: 0.5em;
      background: transparent;
      transition: border-color 0.2s ease;

      &:focus {
        outline: none;
        border-color: var(--fill-tertiary);
      }

      ::-webkit-input-placeholder {
        color: var(--fg-quaternary);
      }
    }

    button {
      background-color: var(--fill-accent);
      color: var(--accent);
      border: none;
      border-radius: 0.5em;
      padding: 0.5em 1em;
      cursor: pointer;
      transition: background-color 0.2s ease, color 0.2s ease;
      outline: none;

      &:hover {
        background-color: color-mix(in srgb, var(--fill-accent), white 3%);
        color: color-mix(in srgb, var(--accent), white 8%);
      }

      &:active {
        background-color: color-mix(in srgb, var(--fill-accent), white 5%);
        color: color-mix(in srgb, var(--accent), white 10%);
      }

      &:disabled {
        background-color: var(--fill-primary);
        cursor: not-allowed;
        color: var(--fill-quaternary);
      }
    }
  `;

  return html`
    <div>
      <div class="messages">
        ${use(this.messages, (i) =>
          i.map(
            (message) => html`
              <div class="${"message " + message.type}">${message.message}</div>
            `,
          ),
        )}
      </div>
      <form
        class="input"
        on:submit="${async (e) => {
          e.preventDefault(); // Prevent default form submission
          this.sendDisabled = true;
          if (this.prompt.trim()) {
            console.log("prompt:", this.prompt);
            this.messages = [
              ...this.messages,
              { type: "user", message: this.prompt },
            ];
            try {
              const message = this.prompt;
              this.prompt = "";
              this.messages = [...this.messages, { type: "assistant", message: "..." }]; // Initialize assistant message
              const response = this.lm.promptStreaming(message);
              let cnt = 0;
              let currentMessage = "";
              for await (const rawChunk of response) {
                console.log(rawChunk);
                let chunk = rawChunk;
                if (cnt === 0) { // For the first chunk, replace "..."
                  this.messages = [
                    ...this.messages.slice(0, -1),
                    { type: "assistant", message: chunk },
                  ];
                  currentMessage = chunk;
                } else {
                  currentMessage += chunk;
                  this.messages = [
                    ...this.messages.slice(0, -1),
                    { type: "assistant", message: currentMessage },
                  ];
                }
                cnt++;
              }
            } catch (error) {
              console.error(error);
              // Remove the "..." placeholder if an error occurs before any response
              if (this.messages[this.messages.length -1]?.message === "...") {
                this.messages = this.messages.slice(0, -1);
              }
              this.messages = [
                ...this.messages,
                { type: "error", message: "Error: " + error.message },
              ];
            }
          }
          console.log("messages:", this.messages);
          this.sendDisabled = false;
        }}"
      >
        <input
          type="text"
          bind:value="${use(this.prompt)}"
          placeholder="Type your message here..."
        />
        <button type="submit" bind:disabled=${use(this.sendDisabled)}>
          Send
        </button>
      </form>
    </div>
  `;
}

window.addEventListener("load", () => {
  document.body.appendChild(h(App));
});
