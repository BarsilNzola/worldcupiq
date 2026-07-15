/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          DEFAULT: "#0B1F17", // near-black turf-night backdrop
          light: "#123527",
        },
        turf: {
          DEFAULT: "#2FA84F", // living-grass green, the "on" state
          dim: "#1C6836",
        },
        floodlight: "#F5F7F2", // warm-white, like stadium lights on the pitch
        scoreboard: "#FFB800", // jumbotron amber for scores/CTAs
        alert: "#FF5C4D", // live/urgent accent
        line: "#2A4A3B", // hairline dividers, like touchline chalk
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
      letterSpacing: {
        widest2: "0.2em",
      },
    },
  },
  plugins: [],
};
