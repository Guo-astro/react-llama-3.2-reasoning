import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { peerDependencies, name } from "./package.json";
import path from "path";
import dts from "vite-plugin-dts";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    dts({
      rollupTypes: true,
      tsconfigPath: "./tsconfig.app.json",
      exclude: ["**/*.stories.ts", "**/*.test.ts"],
    }),
    viteStaticCopy({
      targets: [
        // Copy worker.js from the source directory to the root of the dist folder
        { src: 'src/lib/worker.js', dest: '.' }
      ]
    })
  ],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: "./src/index.ts",
      name: name,
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs", "umd"],
    },
    rollupOptions: {
      external: Object.keys(peerDependencies),
      output: { globals: { react: "React", "react-dom": "ReactDOM" } },
    },
  },
});
