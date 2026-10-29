import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const screens = ["nearbuy", "nearbuy-business"].flatMap((app) =>
  ["sign-in", "sign-up"].map((screen) => ({
    app, screen,
    source: readFileSync(new URL(`../../artifacts/${app}/app/(auth)/${screen}.tsx`, import.meta.url), "utf8"),
  })),
);

function deferred() {
  let resolve!: (value?: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Run the actual screen callback without a browser, accounts, or native OAuth.
// Keep the SDK promise pending to exercise the interval before its chooser opens.
function harness(source: string, overrides: Record<string, unknown> = {}) {
  const file = ts.createSourceFile("screen.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback = "";
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "onSSO") {
      assert.ok(node.initializer && ts.isCallExpression(node.initializer));
      callback = node.initializer.arguments[0].getText(file);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(callback);
  const flow = deferred();
  const activation = deferred();
  const providers: unknown[] = [];
  const calls: unknown[] = [];
  const alerts: unknown[] = [];
  let activations = 0;
  const env = {
    ssoPending: { current: false },
    fetchStatus: "idle",
    setSSOProvider: (value: unknown) => providers.push(value),
    setSubmitError: () => {},
    Alert: { alert: (...args: unknown[]) => alerts.push(args) },
    t: (key: string) => key,
    startSSOFlow: (options: unknown) => { calls.push(options); return flow.promise; },
    clientSSORedirectUri: () => "client://callback",
    sellerSSORedirectUri: () => "seller://callback",
    ssoIncompleteReason: () => null,
    acceptedTerms: true,
    hasLocation: true,
    countryCode: "FR",
    city: { id: "test-city" },
    saveLocation: async () => {},
    savePendingSignupLocation: async () => {},
    recordConsent: async () => {},
    LEGAL_VERSION: "test",
    goHome: () => {},
    router: { replace: () => {} },
    ...overrides,
  };
  const compiled = ts.transpileModule(`const handler = ${callback};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const handler = new Function(...Object.keys(env), `${compiled}; return handler;`)(...Object.values(env));
  const success = {
    createdSessionId: "test-session",
    setActive: async () => { activations++; await activation.promise; },
  };
  return { handler, flow, activation, providers, calls, alerts, env, success, activations: () => activations };
}

for (const { app, screen, source } of screens) {
  const name = `${app}/${screen}`;
  test(`${name}: selected provider shows loading and every auth button is disabled`, () => {
    for (const provider of ["google", "apple"]) {
      assert.match(source, new RegExp(`loading=\\{ssoProvider === "oauth_${provider}"\\}`));
      const handler = provider === "google" ? "onGoogle" : "onApple";
      const button = source.match(new RegExp(`onPress=\\{${handler}\\}[\\s\\S]*?testID="sso-${provider}"`));
      assert.ok(button);
      assert.match(button[0], /disabled=\{[^}]*ssoProvider !== null[^}]*fetchStatus === "fetching"/);
    }
    assert.match(source, /title=\{t\("auth\.sign(?:In|Up)Button"\)\}[\s\S]*?disabled=\{[^}]*ssoProvider !== null/);
    assert.match(source, /const handleSubmit = async \(\) => \{\s*if \(ssoPending\.current\) return;/);
  });

  for (const provider of ["google", "apple"]) {
    test(`${name}: ${provider} loads immediately, blocks rapid/cross-provider taps, and retries after cancellation`, async () => {
      const h = harness(source);
      const pending = h.handler(`oauth_${provider}`, provider);
      assert.equal(h.env.ssoPending.current, true);
      assert.deepEqual(h.providers, [`oauth_${provider}`]);
      assert.equal(h.calls.length, 1);
      await h.handler("oauth_google", "google");
      await h.handler("oauth_apple", "apple");
      assert.equal(h.calls.length, 1);
      h.flow.resolve({ authSessionResult: { type: "cancel" } });
      await pending;
      assert.equal(h.env.ssoPending.current, false);
      assert.deepEqual(h.providers, [`oauth_${provider}`, null]);
      await h.handler(`oauth_${provider}`, provider);
      assert.equal(h.calls.length, 2);
      assert.equal(h.providers.at(-1), null);
    });
  }

  test(`${name}: errors clear loading and permit another attempt`, async () => {
    const h = harness(source);
    const pending = h.handler("oauth_google", "google");
    h.flow.reject(new Error("SDK failure"));
    await pending;
    assert.equal(h.env.ssoPending.current, false);
    assert.deepEqual(h.providers, ["oauth_google", null]);
    assert.equal(h.alerts.length, 1);
    await h.handler("oauth_apple", "apple");
    assert.equal(h.calls.length, 2);
    assert.equal(h.providers.at(-1), null);
  });

  test(`${name}: loading remains active until session activation finishes`, async () => {
    const h = harness(source);
    const pending = h.handler("oauth_apple", "apple");
    h.flow.resolve(h.success);
    await Promise.resolve();
    assert.equal(h.activations(), 1);
    assert.equal(h.env.ssoPending.current, true);
    assert.deepEqual(h.providers, ["oauth_apple"]);
    await h.handler("oauth_google", "google");
    assert.equal(h.calls.length, 1);
    h.activation.resolve();
    await pending;
    assert.equal(h.env.ssoPending.current, false);
    assert.equal(h.providers.at(-1), null);
  });

  test(`${name}: incomplete sessions clear loading on early return`, async () => {
    const h = harness(source, { ssoIncompleteReason: () => "requirements" });
    const pending = h.handler("oauth_google", "google");
    h.flow.resolve({});
    await pending;
    assert.equal(h.alerts.length, 1);
    assert.equal(h.providers.at(-1), null);
    assert.equal(h.env.ssoPending.current, false);
  });

  test(`${name}: existing email request prevents starting OAuth`, async () => {
    const h = harness(source, { fetchStatus: "fetching" });
    await h.handler("oauth_google", "google");
    assert.equal(h.calls.length, 0);
    assert.deepEqual(h.providers, []);
  });

  if (screen === "sign-up") {
    test(`${name}: signup prerequisites remain required without a stuck spinner`, async () => {
      for (const overrides of [{ acceptedTerms: false }, { hasLocation: false }]) {
        const h = harness(source, overrides);
        await h.handler("oauth_google", "google");
        assert.equal(h.calls.length, 0);
        assert.equal(h.env.ssoPending.current, false);
        assert.deepEqual(h.providers, []);
      }
    });
  }
}
