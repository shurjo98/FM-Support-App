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
      "/reorders": "http://localhost:4000",
      "/garments": "http://localhost:4000",
      "/spareparts": "http://localhost:4000",
      "/public": "http://localhost:4000",
      "/content": "http://localhost:4000",
      "/push": "http://localhost:4000",
      "/files": "http://localhost:4000",
      "/analytics": "http://localhost:4000",
      "/audit": "http://localhost:4000",
      "/inventory": "http://localhost:4000",
      "/defects": "http://localhost:4000",
    },
  },
});
