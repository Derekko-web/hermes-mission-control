import { isBrowserRuntime } from './runtime';

interface VsCodeApi {
  postMessage(msg: unknown): void;
  getState?(): unknown;
  setState?(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let browserState: unknown;

export const vscode: VsCodeApi = isBrowserRuntime
  ? {
      postMessage: (msg: unknown) => console.log('[vscode.postMessage]', msg),
      getState: () => browserState,
      setState: (state: unknown) => {
        browserState = state;
      },
    }
  : acquireVsCodeApi();
