# socila-link

SociLaLink Web Application Frontend — Next.js 15, React 19, Tailwind CSS, LiveKit WebRTC, and OpenStreetMap.

## Overview
SociLaLink is a premier dating, companion meetup, and creator discovery platform featuring:
- **Encrypted 1-on-1 Calling**: Bespoke video & voice calls powered by LiveKit WebRTC.
- **Companion Dates & Escrow**: M-PESA Daraja STK Push, 6-digit mutual meeting verification, and automated dispute resolution.
- **Live Location & Directions**: Real-time GPS moving tracking with OpenStreetMap and directional navigation.
- **Privacy First**: Phone numbers and private details unlocked only on mutually confirmed dates.

## Getting Started

1. **Install Dependencies**:
```bash
npm install
```

2. **Configure Environment**:
Copy `.env.example` to `.env.local` and configure your API URL:
```bash
cp .env.example .env.local
```

3. **Run Development Server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Build for Production

```bash
npm run build
npm run start
```
