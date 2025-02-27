import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * OllamaManager - A utility class to handle Ollama LLM API requests
 * This class manages sending requests to Ollama, displaying loading indicators,
 * and showing response dialogs.
 */
export class OllamaManager {
    private baseUrl: string;
    private model: string;
    private isDarkTheme: boolean;

    /**
     * Constructor for OllamaManager
     * @param baseUrl The base URL for Ollama API
     * @param model The model name to use
     * @param isDarkTheme Whether to use dark theme for UI elements
     */
    constructor(baseUrl = 'http://localhost:11434', model = 'llama3.2', isDarkTheme = false) {
        this.baseUrl = baseUrl;
        this.model = model;
        this.isDarkTheme = isDarkTheme;

        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    /**
     * Check if the Ollama server is up and ready
     * @returns True if ready, false otherwise
     */
    public async isReady(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/version`);
            if (response.ok) {
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Set whether to use dark theme for UI elements
     * @param isDarkTheme True for dark theme, false for light theme
     */
    public setDarkTheme(isDarkTheme: boolean): void {
        this.isDarkTheme = isDarkTheme;
    }

    /**
     * Send content to Ollama for processing
     * @param content The content to send
     * @param context Additional context about the content
     * @returns Promise that resolves when the request is complete
     */
    public async sendToOllama(content: string): Promise<void> {
        const loadingElements = this.showLoadingIndicator();

        try {
            // Check if the model is already loaded
            let response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.statusText}`);
            }

            const { models } = await response.json();
            if (
                !models.some(
                    (m: { name: string }) => m.name.replace(':latest', '') === this.model.replace(':latest', '')
                )
            ) {
                throw new Error(
                    `Model ${this.model} is not available locally. Available models: ${models
                        .map((m: { name: string }) => m.name)
                        .join(', ')}`
                );
            }

            const payload = {
                model: this.model,
                prompt: `I have an event from a trace, in that there is an event content ${content} explain it. The response should be in markdown format.`,
                stream: false
            };

            const ollamaUrl = `${this.baseUrl}/api/generate`;
            response = await fetch(ollamaUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                this.showOllamaResponse(data.response);
            } else {
                this.showOllamaError(`Failed to get response: ${response.statusText}`);
            }
        } catch (error) {
            this.showOllamaError(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            this.removeLoadingIndicator(loadingElements);
        }
    }

    /**
     * Show a loading indicator while waiting for the Ollama response
     * @returns The created DOM elements for later removal
     */
    private showLoadingIndicator(): { loadingDiv: HTMLElement; style: HTMLStyleElement } {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'ollama-loading';
        loadingDiv.style.position = 'fixed';
        loadingDiv.style.top = '0';
        loadingDiv.style.left = '0';
        loadingDiv.style.width = '100%';
        loadingDiv.style.height = '100%';
        loadingDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        loadingDiv.style.zIndex = '3000';
        loadingDiv.style.display = 'flex';
        loadingDiv.style.justifyContent = 'center';
        loadingDiv.style.alignItems = 'center';

        const spinner = document.createElement('div');
        spinner.style.width = '50px';
        spinner.style.height = '50px';
        spinner.style.border = '5px solid rgba(255, 255, 255, 0.3)';
        spinner.style.borderRadius = '50%';
        spinner.style.borderTopColor = '#fff';
        spinner.style.animation = 'spin 1s ease-in-out infinite';

        // Add keyframes for the animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        loadingDiv.appendChild(spinner);
        document.body.appendChild(loadingDiv);

        return { loadingDiv, style };
    }

    /**
     * Remove the loading indicator elements
     * @param elements The elements to remove
     */
    private removeLoadingIndicator(elements: { loadingDiv: HTMLElement; style: HTMLStyleElement }): void {
        if (document.body.contains(elements.loadingDiv)) {
            document.body.removeChild(elements.loadingDiv);
        }
        if (document.head.contains(elements.style)) {
            document.head.removeChild(elements.style);
        }
    }

    /**
     * Show the Ollama response in a dialog
     * @param response The response text from Ollama
     */
    private async showOllamaResponse(response: string): Promise<void> {
        const dialogDiv = document.createElement('div');
        dialogDiv.id = 'ollama-response-dialog';
        dialogDiv.style.position = 'fixed';
        dialogDiv.style.left = '50%';
        dialogDiv.style.top = '50%';
        dialogDiv.style.transform = 'translate(-50%, -50%)';
        dialogDiv.style.backgroundColor = this.isDarkTheme ? '#333333' : '#ffffff';
        dialogDiv.style.color = this.isDarkTheme ? '#ffffff' : '#333333';
        dialogDiv.style.border = this.isDarkTheme ? '1px solid #555555' : '1px solid #dddddd';
        dialogDiv.style.borderRadius = '5px';
        dialogDiv.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.25)';
        dialogDiv.style.padding = '20px';
        dialogDiv.style.zIndex = '2000';
        dialogDiv.style.maxWidth = '80%';
        dialogDiv.style.maxHeight = '80vh';
        dialogDiv.style.overflow = 'auto';

        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';
        headerDiv.style.marginBottom = '15px';

        const title = document.createElement('h3');
        title.textContent = `Ollama Analysis Result Using ${this.model}`;
        title.style.margin = '0';
        headerDiv.appendChild(title);

        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.color = this.isDarkTheme ? '#ffffff' : '#333333';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(dialogDiv);
            document.body.removeChild(overlayDiv);
        });
        headerDiv.appendChild(closeButton);

        dialogDiv.appendChild(headerDiv);

        const contentDiv = document.createElement('div');
        contentDiv.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        contentDiv.style.fontSize = '14px';
        contentDiv.style.lineHeight = '1.5';
        contentDiv.style.overflowWrap = 'break-word';

        try {
            contentDiv.innerHTML = DOMPurify.sanitize(await marked(response));
        } catch (error) {
            contentDiv.textContent = response;
        }

        const markdownStyles = document.createElement('style');
        markdownStyles.textContent = `
            #ollama-response-dialog h1, #ollama-response-dialog h2, #ollama-response-dialog h3, 
            #ollama-response-dialog h4, #ollama-response-dialog h5, #ollama-response-dialog h6 {
                margin-top: 1.5em;
                margin-bottom: 0.75em;
                line-height: 1.2;
            }
            #ollama-response-dialog h1 { font-size: 1.8em; }
            #ollama-response-dialog h2 { font-size: 1.5em; }
            #ollama-response-dialog h3 { font-size: 1.3em; }
            #ollama-response-dialog h4 { font-size: 1.2em; }
            #ollama-response-dialog h5 { font-size: 1.1em; }
            #ollama-response-dialog h6 { font-size: 1em; }
            
            #ollama-response-dialog p {
                margin: 0.75em 0;
            }
            
            #ollama-response-dialog pre {
                background-color: ${this.isDarkTheme ? '#222' : '#f5f5f5'};
                padding: 12px;
                border-radius: 4px;
                overflow: auto;
                margin: 1em 0;
            }
            
            #ollama-response-dialog code {
                font-family: monospace;
                background-color: ${this.isDarkTheme ? '#2d2d2d' : '#f0f0f0'};
                padding: 2px 4px;
                border-radius: 3px;
                font-size: 0.9em;
            }
            
            #ollama-response-dialog pre code {
                background-color: transparent;
                padding: 0;
            }
            
            #ollama-response-dialog blockquote {
                margin: 1em 0;
                padding-left: 1em;
                border-left: 4px solid ${this.isDarkTheme ? '#666' : '#ddd'};
                color: ${this.isDarkTheme ? '#ccc' : '#666'};
            }
            
            #ollama-response-dialog ul, #ollama-response-dialog ol {
                margin: 0.75em 0;
                padding-left: 1.5em;
            }
            
            #ollama-response-dialog a {
                color: ${this.isDarkTheme ? '#58a6ff' : '#0366d6'};
                text-decoration: none;
            }
            
            #ollama-response-dialog a:hover {
                text-decoration: underline;
            }
            
            #ollama-response-dialog table {
                border-collapse: collapse;
                margin: 1em 0;
                width: 100%;
            }
            
            #ollama-response-dialog table th, #ollama-response-dialog table td {
                border: 1px solid ${this.isDarkTheme ? '#444' : '#ddd'};
                padding: 6px 12px;
                text-align: left;
            }
            
            #ollama-response-dialog table th {
                background-color: ${this.isDarkTheme ? '#333' : '#f0f0f0'};
            }
            
            #ollama-response-dialog hr {
                border: none;
                border-top: 1px solid ${this.isDarkTheme ? '#444' : '#ddd'};
                margin: 1.5em 0;
            }
        `;
        document.head.appendChild(markdownStyles);

        dialogDiv.appendChild(contentDiv);

        const overlayDiv = document.createElement('div');
        overlayDiv.style.position = 'fixed';
        overlayDiv.style.top = '0';
        overlayDiv.style.left = '0';
        overlayDiv.style.width = '100%';
        overlayDiv.style.height = '100%';
        overlayDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlayDiv.style.zIndex = '1999';
        overlayDiv.addEventListener('click', () => {
            document.body.removeChild(dialogDiv);
            document.body.removeChild(overlayDiv);
            if (document.head.contains(markdownStyles)) {
                document.head.removeChild(markdownStyles);
            }
        });

        closeButton.addEventListener('click', () => {
            if (document.head.contains(markdownStyles)) {
                document.head.removeChild(markdownStyles);
            }
        });

        document.body.appendChild(overlayDiv);
        document.body.appendChild(dialogDiv);
    }

    /**
     * Show an error message dialog
     * @param errorMessage The error message to display
     */
    private showOllamaError(errorMessage: string): void {
        const dialogDiv = document.createElement('div');
        dialogDiv.style.position = 'fixed';
        dialogDiv.style.left = '50%';
        dialogDiv.style.top = '50%';
        dialogDiv.style.transform = 'translate(-50%, -50%)';
        dialogDiv.style.backgroundColor = this.isDarkTheme ? '#552222' : '#fff0f0';
        dialogDiv.style.color = this.isDarkTheme ? '#ffcccc' : '#cc0000';
        dialogDiv.style.border = '1px solid #cc0000';
        dialogDiv.style.borderRadius = '5px';
        dialogDiv.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.25)';
        dialogDiv.style.padding = '20px';
        dialogDiv.style.zIndex = '2000';
        dialogDiv.style.maxWidth = '80%';

        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';
        headerDiv.style.marginBottom = '15px';

        const title = document.createElement('h3');
        title.textContent = 'Error';
        title.style.margin = '0';
        headerDiv.appendChild(title);

        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.color = this.isDarkTheme ? '#ffcccc' : '#cc0000';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(dialogDiv);
            document.body.removeChild(overlayDiv);
        });
        headerDiv.appendChild(closeButton);

        dialogDiv.appendChild(headerDiv);

        const contentDiv = document.createElement('div');
        contentDiv.textContent = errorMessage;
        dialogDiv.appendChild(contentDiv);

        const overlayDiv = document.createElement('div');
        overlayDiv.style.position = 'fixed';
        overlayDiv.style.top = '0';
        overlayDiv.style.left = '0';
        overlayDiv.style.width = '100%';
        overlayDiv.style.height = '100%';
        overlayDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlayDiv.style.zIndex = '1999';
        overlayDiv.addEventListener('click', () => {
            document.body.removeChild(dialogDiv);
            document.body.removeChild(overlayDiv);
        });

        document.body.appendChild(overlayDiv);
        document.body.appendChild(dialogDiv);
    }
}
