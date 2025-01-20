export namespace Headers {
  export type Encoded = [name: string, value: string][];
  /**
   * Take given HeadersInit and append it (mutating) into given Headers.
   *
   * @param headers - The Headers object to append to.
   * @param headersInit - The HeadersInit object to append from.
   */
  export const appendInit = (headers: Headers, headersInit: HeadersInit): void => {
    const newHeaders = new globalThis.Headers(headersInit);
    newHeaders.forEach((value, key) => {
      headers.append(key, value);
    });
  };
}
