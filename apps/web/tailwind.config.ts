import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121417",
        panel: "#f7f8f3",
        line: "#d9ddcf",
        mint: "#2d7d66",
        amber: "#b7791f",
        danger: "#b91c1c"
      }
    }
  },
  plugins: []
};

export default config;
