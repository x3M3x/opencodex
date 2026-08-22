/**
 * Write-time validation for the authenticated dashboard listener, mirroring the
 * loopback listener contract: field shape is schema work, but port collisions are
 * relationships between fields and belong at the boundary (#1102 pattern).
 */
import { describe, expect, test } from "bun:test";
import { validateConfigCandidate } from "../src/config";

const base = {
  port: 10100,
  providers: { openai: { adapter: "openai", baseUrl: "https://chatgpt.com/backend-api/codex" } },
  defaultProvider: "openai",
} as const;

describe("dashboard listener configuration", () => {
  test("an enabled listener sharing the proxy port is rejected at write time", () => {
    const result = validateConfigCandidate({
      ...base,
      dashboardListener: { enabled: true, port: 10100, hostname: "100.88.9.100" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("must differ from the proxy port");
  });

  test("an enabled listener sharing the loopback listener port is rejected", () => {
    const result = validateConfigCandidate({
      ...base,
      unauthenticatedLoopbackListener: { enabled: true, port: 10200 },
      dashboardListener: { enabled: true, port: 10200, hostname: "100.88.9.100" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("must differ from unauthenticatedLoopbackListener.port");
  });

  test("an enabled listener without a hostname is rejected", () => {
    // Unlike the loopback listener, the bind address is the operator's choice; a silent
    // default would bind an interface the operator never named.
    const result = validateConfigCandidate({
      ...base,
      dashboardListener: { enabled: true, port: 10200 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("hostname");
  });

  test("a blank hostname is rejected", () => {
    const result = validateConfigCandidate({
      ...base,
      dashboardListener: { enabled: true, port: 10200, hostname: "   " },
    });
    expect(result.ok).toBe(false);
  });

  test("a disabled listener needs neither port nor hostname", () => {
    const result = validateConfigCandidate({
      ...base,
      dashboardListener: { enabled: false },
    });
    expect(result.ok).toBe(true);
  });

  test("a distinct port with a named bind address is accepted and survives the parse", () => {
    const result = validateConfigCandidate({
      ...base,
      dashboardListener: { enabled: true, port: 10101, hostname: "100.88.9.100" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.dashboardListener).toEqual({ enabled: true, port: 10101, hostname: "100.88.9.100" });
    }
  });
});

