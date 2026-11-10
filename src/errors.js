// Expected user-facing errors: the CLI prints only their message, without a stack trace.
export class BlyssError extends Error {
  name = "BlyssError";
}
