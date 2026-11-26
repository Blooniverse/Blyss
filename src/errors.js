// Expected user-facing errors: the CLI prints only their message, without a stack trace.
export class BlyssError extends Error {
  name = "BlyssError";
}

// Several such errors at once, such as those of the files of a website that a build checks one by one: the message
// holds each of their messages, separated by an empty line.
export class BlyssErrors extends BlyssError {
  name = "BlyssErrors";
  constructor(errors) {
    super(errors.map(error => error.message).join("\n\n"));
    this.errors = errors;
  }
}
