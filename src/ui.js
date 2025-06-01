function App() {
  this.lm = undefined;
  this.messages = [{ type: "info", message: "Preparing model..." }];
  this.prompt = "";
  this.sendDisabled = true;
  this.pageContent = "";
  this.tabTitle = "";
  this.tabUrl = "";

  this.mount = async () => {
    try {
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "GET_PAGE_CONTENT" }, (response) => {
          if (chrome.runtime.lastError) {
            // Handle errors from sendMessage, e.g., if the content script isn't ready
            console.error("Error getting page content:", chrome.runtime.lastError.message);
            this.pageContent = "";
            this.tabTitle = "Error";
            this.tabUrl = "";
            // Optionally, you could reject the promise here if it's a critical error
            // reject(new Error(chrome.runtime.lastError.message));
            // For now, we'll proceed with empty content
            resolve();
            return;
          }
          try {
            this.pageContent = distill(response.content || "", new URL(response.url || "").host);
            this.tabTitle = response.title || "";
            this.tabUrl = response.url || "";
            console.log("Page content:", this.pageContent);
            console.log("Tab title:", this.tabTitle);
            console.log("Tab URL:", this.tabUrl);
          } catch {
            console.warn("womp womp");
          }
          resolve();
        });
      });

      let sysPrompt = [];
      if (!this.pageContent || this.pageContent.length === 0) {
        sysPrompt = [
          {
            role: "system",
            content:
              "You are a helpful assistant designed to answer general questions.",
          },
        ]
      } else {
        sysPrompt = [
          {
            role: "system",
            content:
              `You are a helpful browser assistant designed to answer questions about the current page or general knowledge. The user is looking at a website with the title ${this.tabTitle} and the URL ${this.tabUrl}. Here is the first 500 words of the site's content: ${this.pageContent.split(" ").slice(0, 500).join(" ")}...`
          },
        ];
      }


      this.lm = await LanguageModel.create({
        monitor: (m) => { // Use arrow function to preserve `this` context
          m.addEventListener("downloadprogress", (e) => {
            console.log(`Downloaded ${e.loaded * 100}%`);
            if (0 < e.loaded && e.loaded < 1) {
              this.messages = [
                ...this.messages,
                { type: "info", message: `Downloading model: ${Math.round(e.loaded * 100)}%` }, // Ensure message is an object
              ];
            }
          });
        },
        initialPrompts: sysPrompt,
      });
      console.log("lm:", this.lm);
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
      height: calc(100vh - 8em);
      overflow-y: auto;
    }

    .input {
      display: flex;
      flex-direction: column;
      gap: 0.5em;
      form {
        display: flex;
        gap: 0.75em;
        height: 3em;
        width: 100%;
      }
    }

    .page-info {
      color: var(--fg-secondary);
      font-size: 0.975em;
      margin-bottom: 0.5em;

      div {
        display: flex;
        align-items: center;
        gap: 0.5em;
      }

      div > span > svg {
        fill: var(--fg-secondary);
        width: 1.5em;
        height: 1.5em;
      }

      div > span:not(:has(svg)) {
        display: inline-block;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        max-width: 80%;
      }
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

    .markdown p {
        margin: 0;
    }
  `;

  return html`
    <div>
      <div class="messages">
        ${use(this.messages, (i) =>
          i.map(
            (message) => html`
              <div class="${"message " + message.type}">${parse(message.message)}</div>
            `,
          ),
        )}
      </div>
      <div class="input">
        <div class="page-info">${use(this.pageContent, (content) => {
            if (content && content.length > 0) {
                return html`<div>
                    <span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M160-80q-33 0-56.5-23.5T80-160v-360q0-33 23.5-56.5T160-600h80v-200q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v360q0 33-23.5 56.5T800-360h-80v200q0 33-23.5 56.5T640-80H160Zm0-80h480v-280H160v280Zm560-280h80v-280H320v120h320q33 0 56.5 23.5T720-520v80Z"/></svg></span>
                    <span>Looking at <strong>${use(this.tabTitle)}</strong></span>
                </div>`;
            } else {
                return html`<div>
                    <span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg></span>
                    <span>No page content available.</span>
                </div>`;
            }
        })}</div>
      <form
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
    </div>
  `;
}

// shitty vibecoded function
function distill(html, host) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // 1. Remove unwanted elements globally.
  // These elements are typically not part of the core readable content.
  const selectorsToRemove = [
    'script', 'style', 'link', 'meta', 'noscript', // Standard non-visible, meta, or styling elements
    'header', // Page headers (often global, not article-specific headers)
    'nav',    // Navigation menus
    'footer', // Page footers
    'aside',  // Sidebars, related content often found here
    'iframe', 'embed', 'object', 'applet', // Embedded external content or plugins
    'img', 'picture', 'svg', 'video', 'audio', 'map', 'area', // Media elements
    'form', 'button', 'input', 'select', 'textarea', 'label', 'fieldset', 'legend', // Interactive form elements
    'canvas', // Drawing canvases
    // Common class/id patterns for non-content sections
    '[class*="cookie"]', '[id*="cookie"]', // Cookie consent banners
    '[class*="modal"]', '[id*="modal"]',   // Modal dialogs
    '[class*="popup"]', '[id*="popup"]',   // Popup windows
    '[class*="share"]', '[id*="share"]',   // Social sharing buttons
    '[class*="social"]', '[id*="social"]', // Social media links/widgets
    '[class*="sidebar"]', '[id*="sidebar"]',// Explicit sidebars
    '[class*="comment"]', '[id*="comment"]', // Comment sections and forms
    '[aria-hidden="true"]', // Elements explicitly hidden from assistive technologies (and often users)
    'figure > figcaption', // Captions for figures (figures themselves often contain images, which are removed)
    '.noprint', '[class*="noprint"]' // Elements not meant for printing (often ads or navigation)
  ];
  doc.querySelectorAll(selectorsToRemove.join(', ')).forEach(el => el.remove());

  let hostSpecificElement;

  switch (host) {
    case (host.endsWith("wikipedia.org")):
      hostSpecificElement = doc.body.querySelector("#bodyContent")  // Wikipedia's main content area
      break;
  }

  // 2. Attempt to find the main content element.
  // This is a heuristic and prioritizes common semantic tags and class names for articles.
  let mainContentElement = hostSpecificElement; // Start with host-specific element

  if (!mainContentElement) {
    const selectors = [
      'article',    // HTML5 article tag
      'main',       // HTML5 main tag
      '[role="main"]', // ARIA role for main content
      // Common class names for main content wrappers
      '.entry-content',
      '.post-content',
      '.article-body',
      '.story-content',
      'div[class*="article-content"]', // More generic article content class
      // More generic class names, use with caution as they can be broad
      'div[class*="content"]',
      'div[class*="post"]',
      'div[class*="main"]', // Can be too broad if not specific enough
      // ID-based selectors, often used for main content areas
      'div[id*="content"]',
      'div[id*="main"]'
    ];

    for (const selector of selectors) {
      mainContentElement = doc.querySelector(selector);
      if (mainContentElement) {
        break; // Found an element, stop searching
      }
    }
  }

  // Fallback to the entire body if no specific content area is found
  if (!mainContentElement) {
    mainContentElement = doc.body;
  }

  if (!mainContentElement) {
    // This path should ideally not be taken if doc.body exists.
    console.error("no content");
    return "";
  }

  // 3. Extract text content from the selected main element.
  // The `textContent` property recursively gets the content of all child nodes,
  // ignoring HTML tags, comments, and processing instructions. It effectively "strips formatting".
  let text = mainContentElement.textContent || "";

  // 4. Normalize whitespace.
  // Replace any sequence of one or more whitespace characters (spaces, tabs, newlines, etc.)
  // with a single space. Then, trim leading and trailing whitespace from the result.
  // This ensures the output is a single block of plaintext with words separated by single spaces,
  // fulfilling the "strip all formatting" and "make it all plaintext" requirements.
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

window.addEventListener("load", () => {
  document.body.appendChild(h(App));
});
