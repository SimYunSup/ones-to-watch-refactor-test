import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// Static GitHub Pages deploy: the whole build is served from one artifact
// at https://simyunsup.github.io/ones-to-watch-refactor-test/, with this
// variant mounted under the /react-router/ sub-path.
export default defineConfig({
  base: "/ones-to-watch-refactor-test/react-router/",
  plugins: [reactRouter()],
});
