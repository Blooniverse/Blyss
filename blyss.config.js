// Development preview of the bundled starter; this repository contains no website.
// `npm run build` renders starters/lean/ into public/ without modifying the starter,
// and `npm start` serves the result. Create websites with `blyss init`.
import starter from "./starters/lean/blyss.config.js";

const fromStarter = directory => `starters/lean/${starter.directories[directory]}`;

export default {
  ...starter,
  directories: {
    content: fromStarter("content"),
    public: "public",
    static: fromStarter("static"),
    templates: fromStarter("templates")
  }
};
