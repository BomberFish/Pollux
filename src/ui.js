function App() {
  this.lm = undefined;
  this.messages = [{ type: "info", message: "Preparing model..." }];
  this.prompt = "";
  this.sendDisabled = true;

  this.mount = async () => {
    try {
      this.lm = await LanguageModel.create({
        monitor(m) {
          m.addEventListener("downloadprogress", e => {
            console.log(`Downloaded ${e.loaded * 100}%`);
            if (0 < e.loaded && e.loaded < 1) {
              this.messages = [...this.messages, `Downloading model: ${Math.round(e.loaded * 100)}%`];
            }
          });
        },
        initialPrompts: [
          {role: "system", content: "You are a helpful assistant. Do not use Markdown to format your responses."}, // TODO: Add Markdown support
        ]
      });
      console.log("lm:", this.lm);
      // this.messages = [...this.messages, "Model ready!"];
      this.messages = [
        ...this.messages,
        { type: "info", message: "Model ready!" }
      ];
      this.sendDisabled = false;
    } catch(error) {
      this.messages = [...this.messages, { type: "error", message: "Failed to load model: " + error }];
      console.error(error);
    }
  }

  useChange(this.messages, () => {
    console.log("messages changed:", this.messages);
  })

  this.css = `
    background-color: var(--bg);
    color: var(--fg);
    max-width: 100%;
    height: 100vh;
    padding: 1.2em;
    margin: 0;
    overflow: hidden;

    .message {
      padding: 1em;
      margin: 0.8em 0;
      border-radius: 0.8em;
      background-color: var(--fill-primary);
      min-width: fit-content;
      max-width: min(max(80%, 20em), 100%);
      line-height: 1.4;
      white-space: pre-line;
    }

    .message.user {
      margin-left: auto;
      background-color: color-mix(in srgb, color-mix(in srgb, var(--fill-primary) 75%, transparent), var(--fg-secondary) 20%);
      border-bottom-right-radius: 0.2em;
    }

    .message.assistant {
      margin-right: auto;
      border-bottom-left-radius: 0.2em;
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
      gap: 0.8em;
      height: 3em;

      input {
        flex: 1;
      }
    }
  `

  return html `
      <div>
          <div class="messages">
            ${use(this.messages, (i) => i.map((message) => html`
                <div class="${"message " + message.type}">${message.message}</div>
            `))}
          </div>
          <div class="input">
            <input type="text" bind:value="${use(this.prompt)}" placeholder="Type your message here..." />
                <button bind:disabled=${use(this.sendDisabled)}
                on:click="${async () => {
                    this.sendDisabled = true;
                    if (this.prompt.trim()) {
                        console.log("prompt:", this.prompt);
                        this.messages = [...this.messages, { type: "user", message: this.prompt }];
                        try {
                            const message = this.prompt;
                            this.prompt = "";
                            this.messages = [...this.messages, "..."];
                            const response = this.lm.promptStreaming(message);
                            let cnt = 0;
                            for await (const rawChunk of response) {
                                console.log(rawChunk);
                                let chunk = rawChunk;
                                let currentMessage = "";
                                if (cnt !== 0) {
                                     currentMessage = this.messages[this.messages.length - 1].message;
                                }
                                this.messages = [
                                    ...this.messages.slice(0, -1),
                                    { type: "assistant", message: currentMessage + chunk }
                                ];
                                cnt++;
                            }
                        } catch(error) {
                            console.error(error);
                            this.messages = [
                                ...this.messages,
                                { type: "error", message: "Error: " + error.message }
                            ];
                        }
                    }
                    console.log("messages:", this.messages);
                    this.sendDisabled = false;
                }}">Send</button>
            </div>
      </div>
  `
}

window.addEventListener('load', () => {
    document.body.appendChild(h(App))
})
