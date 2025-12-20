<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>


# Integrated Quant Terminal

An advanced AI-powered market analytics terminal for institutional and retail traders. Features real-time sentiment, price analytics, options flow, and more, built with React, TypeScript, and Vite.

View your app in AI Studio: https://ai.studio/apps/drive/1La9dcp9Ok0t_R6qqGu1oP5QNgAfrXGUi

## Features

- Real-time market sentiment and signal alerts
- Interactive price charts with technical indicators (SMA, MACD, RSI, ATR)
- Options flow and confidence matrix
- Institutional/retail signal separation
- Robust error handling and logging
- Modern, responsive UI
- Strict TypeScript types and full test coverage

## Getting Started

**Prerequisites:** Node.js (v18+ recommended)

1. Install dependencies:
   ```sh
   npm install
   ```
2. Set your Gemini API key in `.env.local`:
   ```env
   GEMINI_API_KEY=your_key_here
   ```
3. Run the app locally:
   ```sh
   npm run dev
   ```

## Testing

Run all unit and integration tests:

```sh
npm test
```
## Test Coverage

Generate a code coverage report:

```sh
npm run test:coverage
```

The coverage report will be available in the `coverage/` directory. Open `coverage/lcov-report/index.html` in your browser for a detailed view.

## Linting & Formatting

Check code style and catch errors:

```sh
npm run lint
```

Auto-format code with Prettier:

```sh
npm run format
```

## Build & Deployment

Build for production:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

Deploy the contents of the `dist/` folder to your preferred static hosting provider (Vercel, Netlify, etc).

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repo and create your branch from `main`.
2. Ensure all tests pass (`npm test`).
3. Run `npm run lint` and `npm run format` before submitting.

## License

MIT
