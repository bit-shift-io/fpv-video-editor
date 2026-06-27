# Glossary

## AppContext
A plain object passed through the call stack that carries all injectable dependencies (`processor`, `collection`). Created once at the entry point and threaded down through interactive mode, prompts, and run functions. The default instance wires up real ffmpeg and filesystem implementations.

## IVideoProcessor
Interface over the ffmpeg operations (join, convert, extract, audio, speed, image-to-video). The real implementation lives in `video-processor.ts`; tests supply a mock object that satisfies the same interface.

## IFileCollection
Interface over filesystem listing operations (list video files, list image files, list subdirectories). The real implementation lives in `collection.ts`; tests supply a mock object.

## run function
The action layer of a command — pure logic: resolve paths, build auto-output names, call `ctx.processor`, handle spinner feedback. Accepts an `AppContext` as its last optional parameter (defaults to `defaultContext`).

## prompt function
The interactive TUI layer of a command — uses `@inquirer/prompts` to gather user input, then delegates to the corresponding `run` function. Not unit-tested (inquirer requires a real TTY); accepts `AppContext` and threads it through to `run`.

## ISpinner / IOra
`IOra` is the type of the `ctx.ora` factory: `(text: string) => ISpinner`. `ISpinner` covers the `start`, `succeed`, `fail`, and `stop` methods used by `run*` functions. Both are defined in `src/context.ts`. The real `defaultContext` wraps the `ora` npm package; tests pass a `vi.fn()` stub.

## command
A single editor operation (join, convert, extract, bulk-extract, audio, speed, image). Each lives in `src/commands/<name>/` with `run.ts`, `prompt.ts`, `index.ts`, and `__tests__/run.unit.test.ts`.

## BulkClip
A single extraction job parsed from a bulk text file: `{ videoPath: string; startTime: string; endTime: string }`. Produced by `parseBulkFile` and consumed by `runBulkExtract`.

## bulk file
A plain-text file listing one or more video paths, each followed by time-range lines in `<start>-<end>` format. Blank lines are skipped. Trailing text after the end time is treated as a comment and ignored.
