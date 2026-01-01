# Bounty Tour - Travel & Excursion Booking App

## Overview
A modern React + Vite web application for booking excursions in Thailand and exchanging currency. Features an AI chatbot powered by Gemini for tour recommendations.

## Tech Stack
- **Frontend**: React 19, Vite 7, Tailwind CSS 4
- **UI Components**: Lucide React icons
- **Backend Integration**: Airtable API (optional), Gemini API (for AI chat)
- **Styling**: Tailwind CSS with custom animations

## Features
1. **Excursion Catalog** - Browse and book tours with mock data (Phi Phi Islands, Similan Islands, Elephant Farm)
2. **Booking System** - Form-based booking with passenger details
3. **Currency Exchange** - Submit exchange requests between RUB/USD/USDT/THB
4. **AI Chat Assistant** - Travel Genius AI powered by Google Gemini for recommendations
5. **Responsive Design** - Mobile-first with smooth animations

## Project Structure
```
src/
├── App.jsx          # Main component with all features
├── main.jsx         # React DOM entry point
└── index.css        # Global styles with Tailwind

public/
├── image.png        # Logo image
└── vite.svg         # Vite logo

Configuration files:
├── vite.config.js   # Vite dev server config
├── tailwind.config.js # Tailwind CSS config
├── postcss.config.js # PostCSS config
└── index.html       # HTML entry point
```

## Issues Fixed
- ✅ Added Vite server configuration for Replit (host: 0.0.0.0, port: 5000)
- ✅ Configured allowed hosts for iframe proxy compatibility
- ✅ Set up workflow for development server

## Configuration
### Required API Keys (Secrets)
Add these keys in the **Secrets** tab for full functionality:
- `VITE_GEMINI_API_KEY`: For AI Chat recommendations.
- `VITE_AIRTABLE_API_KEY`: Personal Access Token for Airtable.
- `VITE_AIRTABLE_BASE_ID`: Your Airtable Base ID.

The app will gracefully fallback to **Demo Mode** if these are missing.

## Running the App
- Development: `npm run dev` (runs on http://localhost:5000)
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint`

## Notes
- Mock excursion data is used when Airtable is not configured
- AI chat responds in Russian with emoji support
- Smooth animations and transitions throughout the UI
- Fully mobile-responsive design
