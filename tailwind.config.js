/** @type {import('tailwindcss').Config} */
module.exports = {
   content: [
    "./app/*.{js,ts,jsx,tsx,mdx}",
    "./app/page.{js,ts,jsx,tsx,mdx}",
    "./app/layout.{js,ts,jsx,tsx,mdx}",
    "./app/apply/*.{js,ts,jsx,tsx,mdx}",
    "./app/apply/thank-you/*.{js,ts,jsx,tsx,mdx}",
    "./app/admin/*.{js,ts,jsx,tsx,mdx}", // السطر الجديد للوحة التحكم
    "./components/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0F6B6B",
          dark: "#0A4F4F",
        },
      },
      fontFamily: {
        sans: ["Tajawal", "sans-serif"],
      },
    },
  },
  plugins: [],
};
