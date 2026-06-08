// vite.config.js
import { defineConfig } from "file:///sessions/youthful-cool-heisenberg/mnt/PG-Sistema-Web-Progresivo-De-Reservas/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/youthful-cool-heisenberg/mnt/PG-Sistema-Web-Progresivo-De-Reservas/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///sessions/youthful-cool-heisenberg/mnt/PG-Sistema-Web-Progresivo-De-Reservas/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Sportika",
        short_name: "Sportika",
        description: "Gesti\xF3n de canchas deportivas, partidos y torneos en Cochabamba",
        theme_color: "#8B0000",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"]
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMveW91dGhmdWwtY29vbC1oZWlzZW5iZXJnL21udC9QRy1TaXN0ZW1hLVdlYi1Qcm9ncmVzaXZvLURlLVJlc2VydmFzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvc2Vzc2lvbnMveW91dGhmdWwtY29vbC1oZWlzZW5iZXJnL21udC9QRy1TaXN0ZW1hLVdlYi1Qcm9ncmVzaXZvLURlLVJlc2VydmFzL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9zZXNzaW9ucy95b3V0aGZ1bC1jb29sLWhlaXNlbmJlcmcvbW50L1BHLVNpc3RlbWEtV2ViLVByb2dyZXNpdm8tRGUtUmVzZXJ2YXMvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6ICdTcG9ydGlrYScsXG4gICAgICAgIHNob3J0X25hbWU6ICdTcG9ydGlrYScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnR2VzdGlcdTAwRjNuIGRlIGNhbmNoYXMgZGVwb3J0aXZhcywgcGFydGlkb3MgeSB0b3JuZW9zIGVuIENvY2hhYmFtYmEnLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyM4QjAwMDAnLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnIzBhMGEwYScsXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAgeyBzcmM6ICcvaWNvbi0xOTIucG5nJywgc2l6ZXM6ICcxOTJ4MTkyJywgdHlwZTogJ2ltYWdlL3BuZycgfSxcbiAgICAgICAgICB7IHNyYzogJy9pY29uLTUxMi5wbmcnLCBzaXplczogJzUxMng1MTInLCB0eXBlOiAnaW1hZ2UvcG5nJyB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Z30nXVxuICAgICAgfVxuICAgIH0pXG4gIF1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXNaLFNBQVMsb0JBQW9CO0FBQ25iLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFFeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLFVBQ0wsRUFBRSxLQUFLLGlCQUFpQixPQUFPLFdBQVcsTUFBTSxZQUFZO0FBQUEsVUFDNUQsRUFBRSxLQUFLLGlCQUFpQixPQUFPLFdBQVcsTUFBTSxZQUFZO0FBQUEsUUFDOUQ7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxjQUFjLENBQUMsZ0NBQWdDO0FBQUEsTUFDakQ7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
