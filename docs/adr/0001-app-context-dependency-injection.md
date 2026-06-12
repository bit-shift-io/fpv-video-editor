# ADR 0001: AppContext Dependency Injection Pattern

**Status:** Accepted
**Date:** 2026-06-13

## Context

The `run*` action functions in each command call `video-processor.ts` directly via ES module imports. This makes unit testing impossible without `vi.mock()` module interception, which is order-sensitive, bypasses TypeScript type checking on mock shapes, and ties tests to module internals rather than public contracts.

## Decision

Introduce an `AppContext` object that carries all external dependencies (`IVideoProcessor`, `IFileCollection`) as typed interfaces. The real implementations are wrapped into a `defaultContext` singleton used by all production callers. `run*` and `prompt*` functions accept `ctx: AppContext = defaultContext` as a final optional parameter. Tests pass a mock context built from plain objects — no module interception required.

## Alternatives Considered

- **`vi.mock()` per test file** — rejected because mocks are loosely typed (TypeScript does not verify the mock matches the real interface), module hoisting is order-sensitive, and the approach couples tests to module paths rather than behaviour contracts.
- **Class-based injection (constructor DI)** — rejected because `IVideoProcessor` and `IFileCollection` are stateless; wrapping them in a class adds ceremony with no benefit.
- **Global singleton / service locator** — rejected because it hides dependencies and makes test isolation harder (shared mutable state between tests).

## Consequences

- Every `run*` and `prompt*` function gains one optional parameter. Existing callers are unaffected (the parameter defaults to `defaultContext`).
- Mock objects must satisfy the full `IVideoProcessor` / `IFileCollection` interfaces. TypeScript enforces this at compile time — if the interface changes, broken mocks are caught before the test even runs.
- Adding a new injectable dependency means adding one field to `AppContext`; no function signatures outside of that context definition need to change.
- The pattern is explicit: reading any `run*` function makes its dependencies visible in the signature.
