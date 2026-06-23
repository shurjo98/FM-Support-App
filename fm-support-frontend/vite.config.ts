import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/dashboard": "http://localhost:4000",
      "/tickets": "http://localhost:4000",
      "/machines": "http://localhost:4000",
      "/ai": "http://localhost:4000",
      "/auth": "http://localhost:4000",
      "/users": "http://localhost:4000",
      "/purchases": "http://localhost:4000",
      "/needles": "http://localhost:4000",
      "/public": "http://localhost:4000",
    },
  },
});
