import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as customerCore from "../../artifacts/nearbuy/lib/pendingSignupLocationCore";
import * as businessCore from "../../artifacts/nearbuy-business/lib/pendingSignupLocationCore";

type Core = typeof customerCore;

function createMemoryStorage() {
  const data = new Map<string, string>();
  const removed: string[] = [];
  return {
    data,
    removed,
    storage: {
      async getItem(key: string) {
        return data.get(key) ?? null;
      },
      async setItem(key: string, value: string) {
        data.set(key, value);
      },
      async removeItem(key: string) {
        removed.push(key);
        data.delete(key);
      },
    },
  };
}

function runCoreContract(name: string, core: Core) {
  describe(`${name} pending signup location`, () => {
    it("stores values per user, notifies subscribers, and clears selectively", async () => {
      const memory = createMemoryStorage();
      const store = core.createPendingSignupLocationStore(
        memory.storage,
        `${name}.pending`,
      );
      let notifications = 0;
      const unsubscribe = store.subscribe(() => {
        notifications += 1;
      });

      await store.save("user-a", { countryCode: "TG", cityId: "city-a" });
      await store.save("user-b", { countryCode: "FR", cityId: "city-b" });
      unsubscribe();
      await store.save("user-b", { countryCode: "BE", cityId: "city-c" });

      assert.equal(notifications, 2);
      assert.deepEqual(await store.read("user-a"), {
        countryCode: "TG",
        cityId: "city-a",
      });
      assert.deepEqual(await store.read("user-b"), {
        countryCode: "BE",
        cityId: "city-c",
      });

      await store.clear("user-a");
      assert.equal(await store.read("user-a"), null);
      assert.deepEqual(await store.read("user-b"), {
        countryCode: "BE",
        cityId: "city-c",
      });
    });

    it("removes malformed stored JSON", async () => {
      const memory = createMemoryStorage();
      const prefix = `${name}.pending`;
      const store = core.createPendingSignupLocationStore(memory.storage, prefix);
      memory.data.set(`${prefix}:broken-user`, "{not-json");

      assert.equal(await store.read("broken-user"), null);
      assert.deepEqual(memory.removed, [`${prefix}:broken-user`]);
    });

    it("retries without real delays and clears only after success", async () => {
      const pending = { countryCode: "TG", cityId: "city-a" };
      const waits: number[] = [];
      const updates: { location: typeof pending; token: string }[] = [];
      const cleared: string[] = [];
      let invalidations = 0;
      let attempts = 0;

      const result = await core.syncPendingSignupLocation({
        userId: "user-a",
        readPending: async () => pending,
        clearPending: async (userId) => {
          cleared.push(userId);
        },
        getToken: async () => "session-token",
        updateLocation: async (location, token) => {
          attempts += 1;
          updates.push({ location, token });
          if (attempts < 3) throw new Error("temporary network failure");
        },
        invalidateMe: async () => {
          invalidations += 1;
        },
        wait: async (milliseconds) => {
          waits.push(milliseconds);
        },
      });

      assert.equal(result, "synced");
      assert.equal(attempts, 3);
      assert.deepEqual(waits, [1000, 2000]);
      assert.deepEqual(cleared, ["user-a"]);
      assert.equal(invalidations, 1);
      assert.deepEqual(updates[0], {
        location: pending,
        token: "session-token",
      });
    });

    it("keeps the pending value after all attempts fail", async () => {
      const waits: number[] = [];
      let tokenRequests = 0;
      let cleared = false;

      const result = await core.syncPendingSignupLocation({
        userId: "user-a",
        readPending: async () => ({ countryCode: "TG", cityId: "city-a" }),
        clearPending: async () => {
          cleared = true;
        },
        getToken: async () => {
          tokenRequests += 1;
          return null;
        },
        updateLocation: async () => {
          throw new Error("must not run without a token");
        },
        invalidateMe: async () => undefined,
        wait: async (milliseconds) => {
          waits.push(milliseconds);
        },
      });

      assert.equal(result, "pending");
      assert.equal(tokenRequests, 5);
      assert.equal(cleared, false);
      assert.deepEqual(waits, [1000, 2000, 4000, 8000]);
    });

    it("stops retries when the owning screen is cancelled", async () => {
      let cancelled = false;
      let waits = 0;
      let attempts = 0;

      const result = await core.syncPendingSignupLocation({
        userId: "user-a",
        readPending: async () => ({ countryCode: "TG", cityId: "city-a" }),
        clearPending: async () => undefined,
        getToken: async () => "session-token",
        updateLocation: async () => {
          attempts += 1;
          cancelled = true;
          throw new Error("screen unmounted");
        },
        invalidateMe: async () => undefined,
        isCancelled: () => cancelled,
        wait: async () => {
          waits += 1;
        },
      });

      assert.equal(result, "cancelled");
      assert.equal(attempts, 1);
      assert.equal(waits, 0);
    });

    it("does nothing when no signup location is pending", async () => {
      let tokenRequests = 0;
      const result = await core.syncPendingSignupLocation({
        userId: "user-a",
        readPending: async () => null,
        clearPending: async () => undefined,
        getToken: async () => {
          tokenRequests += 1;
          return "session-token";
        },
        updateLocation: async () => undefined,
        invalidateMe: async () => undefined,
      });

      assert.equal(result, "empty");
      assert.equal(tokenRequests, 0);
    });
  });
}

runCoreContract("NearBuy", customerCore);
runCoreContract("BizIci Pro", businessCore);