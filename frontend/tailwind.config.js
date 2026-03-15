module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/figma/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#f3e2c5",
        ember: "#d3a625",
        forest: "#6b5a3a",
        mahogany: "#3a2b22"
      },
      boxShadow: {
        lift: "0 16px 0 rgba(20, 14, 9, 0.6), 0 24px 50px rgba(6, 4, 2, 0.4)"
      }
    }
  },
  plugins: []
};
