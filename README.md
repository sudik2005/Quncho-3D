# QUNCHO 🧭⛰️

**Quncho** (meaning *Summit* or *Peak* in Amharic) is a high-performance, 3D web dashboard for visualizing GPS tracks. It turns your flat mountain adventures into an immersive, textured 3D experience.

[![Project Demo](https://img.shields.io/badge/Preview-Live%20Dashboard-cyan)](http://localhost:3000)
[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2015%20|%20MapLibre%20|%20Tailwind-blue)](https://nextjs.org)

## 🏗️ The "Zero-Cost" Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & Turbopack)
- **3D Maps**: [MapLibre GL JS](https://maplibre.org/) with AWS Open Data 3D Terrain-RGB tiles.
- **Design**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn/UI](https://ui.shadcn.com/), and [Framer Motion](https://www.framer.com/motion/).
- **Data Handling**: [GPXParser](https://github.com/luiz-claudio/gpxparser) (Full local-first, no server needed).

## ✨ Key Features
- **Immersive 3D Terrain**: Realistic height extrusion using Global Terrain-RGB elevation data.
- **Neon-Glow Visualization**: Routes rendered as glowing blue tracks that hug the terrain.
- **Local-First Privacy**: All GPS parsing happens directly in your browser.
- **Bento Grid Analytics**: Real-time stats for distance, elevation Gain, and pace.
- **Elevation Profiles**: Interactive charts showing your altitude changes second-by-second.

## 🚀 Getting Started

1. **Install Dependencies**:
```bash
npm install
```

2. **Run the Development Server**:
```bash
npm run dev
```

3. **Enjoy!**: Open [http://localhost:3000](http://localhost:3000) and upload your favorite `.gpx` file or use the built-in **Sample Data** from the Simien Mountains.

## 🏔️ Origins
"Quncho" was designed for those who reach the peaks of the Ethiopian Highlands and want to see their tracks come to life in 3D.

---
Built with ❤️ for explorer, hikers, and innovators. 🌍🚀
