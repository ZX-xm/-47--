import { defineConfig } from "vite";

export default defineConfig({
  base: "/47cardgame/",
  root: ".",
  server: {
    port: 5173,
    open: true,
  },
});
