/* eslint-disable  @typescript-eslint/no-unused-vars */

// The content of this file is used as a string
// and feed into the context of the Monaco Editor and the Preflight Script.
// The lack of `declare const lab: LabAPI` is intentional, to avoid messing up the global scope
// of the web app codebase.
// This could be a string in `graphiql-plugin.tsx`, but it's better to keep it in a separate file,
// and use Prettier to format it, have syntax highlighting, etc.

interface LabAPI {
  /**
   * Contains aspects of the request that you can manipulate before it is sent.
   */
  request: {
    /**
     * The headers of the request.
     */
    headers: Headers;
  };
  /**
   * [CryptoJS](https://cryptojs.gitbook.io/docs) library.
   */
  CryptoJS: any;
  /**
   * Use lab.environment API to store and retrieve data between requests
   * or to pass values directly to HTTP headers for executed GraphQL requests.
   */
  environment: {
    /**
     * Returns the value of the environment variable with the given key.
     */
    get(key: string): unknown;
    /**
     * Sets the value of the environment variable with the given key.
     */
    set(key: string, value: unknown): void;
  };
  /**
   * Mimics the \`prompt\` function in the browser, by sending a message to the main thread
   * and waiting for a response.
   */
  prompt(message: string, defaultValue?: string): Promise<string>;
}
