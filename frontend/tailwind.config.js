module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/figma/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#f3e9d6",
        ember: "#d7b369",
        forest: "#2d6b52",
        mahogany: "#3c3024"
      },
      boxShadow: {
        lift: "0 16px 0 rgba(20, 14, 9, 0.6), 0 24px 50px rgba(6, 4, 2, 0.4)"
      }
    }
  },
  plugins: []
};
