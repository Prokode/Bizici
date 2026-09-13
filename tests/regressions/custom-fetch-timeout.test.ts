import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  customFetch,
  setAuthTokenGetter,
} from "../../lib/api-client-react/src/custom-fetch";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  setAuthTokenGetter(null);
});

function responseWithBody(body: Promise<string> | string): Response {
  const text = typeof body === "string" ? async () => body : () => body;
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    body: {},
    url: "https://example.test/api/shops",
    text,
  } as unknown as Response;
}

function timeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "RequestTimeoutError" &&
    /timed out/i.test(error.message)
  );
}

describe("customFetch request deadlines", () => {
  it("does not apply a network timeout unless timeoutMs is provided", async () => {
    globalThis.fetch = async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return responseWithBody('{"ok":true}');
    };

    await assert.doesNotReject(
      customFetch<{ ok: boolean }>("https://example.test/api/slow", {
        responseType: "json",
      }),
    );
  });

  it("aborts a selected request while fetch is still pending", async () => {
    let wasAborted = false;
    globalThis.fetch = async (_input, init) => {
      await new Promise<void>((resolve) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            wasAborted = true;
            resolve();
          },
          { once: true },
        );
      });
      return responseWithBody('{"ok":true}');
    };

    await assert.rejects(
      customFetch("https://example.test/api/shops", {
        timeoutMs: 10,
        responseType: "json",
      }),
      timeoutError,
    );
    assert.equal(wasAborted, true);
  });

  it("keeps the selected deadline active while consuming the response body", async () => {
    const body = new Promise<string>((resolve) => {
      setTimeout(() => resolve('{"ok":true}'), 30);
    });
    globalThis.fetch = async () => responseWithBody(body);

    await assert.rejects(
      customFetch("https://example.test/api/shops", {
        timeoutMs: 10,
        responseType: "json",
      }),
      timeoutError,
    );
  });

  it("preserves caller cancellation through response body consumption", async () => {
    const controller = new AbortController();
    const body = new Promise<string>((resolve) => {
      setTimeout(() => resolve('{"ok":true}'), 30);
    });
    globalThis.fetch = async () => responseWithBody(body);

    const pending = customFetch("https://example.test/api/shops", {
      responseType: "json",
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 5);

    await assert.rejects(
      pending,
      (error: unknown) => error instanceof Error && error.name === "AbortError",
    );
  });

  it("bounds token acquisition using the selected request deadline", async () => {
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return responseWithBody('{"ok":true}');
    };
    setAuthTokenGetter(() => new Promise<string | null>(() => undefined));

    await assert.rejects(
      customFetch("https://example.test/api/shops", {
        timeoutMs: 10,
        responseType: "json",
      }),
      timeoutError,
    );
    assert.equal(fetchCalls, 0);
  });
});