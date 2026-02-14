/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
                mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
            },
            colors: {
                primary: '#18181b', // "Open Code Black" (Zinc 900) - Replacing Blue
                background: '#ffffff', // White
                surface: '#f4f4f5', // Zinc 100 - Light gray for sidebars/cards
                border: '#e4e4e7', // Zinc 200
                text: '#09090b', // Zinc 950
            }
        },
    },
    plugins: [],
}
