import { defineConfig } from "vite";

export default defineConfig({
  define: {
    global: "globalThis",
    "process.env": {},
  },
  build: {
    target: "esnext",
    rollupOptions: {
      /**
       * Ignore "use client" waning since we are not using SSR
       * @see {@link https://github.com/TanStack/query/pull/5161#issuecomment-1477389761 Preserve 'use client' directives TanStack/query#5161}
       */
      onwarn(warning, warn) {
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.message.includes(`"use client"`)
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
  optimizeDeps: {
    // https://github.com/vitejs/vite/issues/13756
    exclude: ["evmole"],
  },
});
