# 🌌 PPTMate: Cinematic 3D Presentation

A highly interactive, 3D cinematic presentation engine 🚀 built natively in the browser. 

Instead of traditional, static slides or heavy pre-rendered videos, PPTMate utilizes advanced WebGL physics, procedural generation, and scroll-driven camera paths to deliver an unforgettable, immersive presentation experience.

---

## 🚀 Features

* 🎥 **Scroll-Driven Cinematography**: A dynamic camera that flies along a precise 3D curve synchronized with native scrolling.
* 🕳️ **Interactive Black Hole**: A 20,000-particle accretion disk powered by Euler velocity integration, featuring mouse-repulsion wakes and gravity spring physics.
* 🪨 **High-Performance Geometry**: Uses `InstancedMesh` to render 300 high-poly, slowly orbiting asteroids in a single draw call.
* ⌨️ **Smart Navigation**: Custom keyboard interceptors that perfectly map arrow keys to HTML slide boundaries.
* ✨ **Dynamic Glassmorphism UI**: Beautiful frosted-glass cards featuring text with a dynamic, mouse-tracking radial gradient glow.
* 🌠 **Easter Eggs**: Secret interactive elements, including a clickable comet and a Spacebar-triggered "Hyperspace Warp" that dives directly through the black hole.
* ⚡ **Lightning Fast**: Built on Vite with aggressive RAM-based image preloading for instantaneous interaction.

---

## ⚙️ How It Works

1. The app renders an invisible HTML overlay (`ScrollControls`) on top of a WebGL Canvas.
2. As you scroll down the invisible HTML page, your scroll percentage (`scroll.offset`) is mapped to a 3D coordinate on a `CatmullRomCurve3` spline.
3. The camera elegantly steers and flies along this path, syncing perfectly with the textual content appearing on the screen.
4. CSS `backdrop-filter` creates the illusion that the text is printed on floating glass panels hovering above the 3D void.

---

## 📦 Installation

### 🛠️ Method: Local Development

1. Download or clone this repository

```bash
git clone https://github.com/PRUTHVIVV/BlackHole.git
```

2. Navigate into the project folder

```bash
cd PPTMate
```

3. Install all dependencies (requires Node.js)

```bash
npm install
```

4. Start the Vite development server

```bash
npm run dev
```

5. Open the provided `localhost` URL in your browser!

---

## 📖 Usage

1. Open the local application in your browser.
2. Ensure your volume is up—the ambient space audio will begin on your first interaction.
3. Use your **Mouse Scroll Wheel**, **Trackpad**, or **Arrow Keys (Up/Down)** to fly through the presentation.
4. **Interactive Elements:**
   * Move your mouse over the bright accretion disk to scatter the particles.
   * Click on the passing comet to reveal the Phoenix Team.
   * On Slide 5 (TestiQo), press the `ArrowDown` key to trigger an asteroid strike and view the image carousel.
   * On the final Q&A Slide, press the `Spacebar` to initiate a Hyperspace Warp.

---

## 🗂️ Project Structure

```text
PPTMate/
│
├── public/                 # Static assets (images, textures, icons)
├── src/
│   ├── App.jsx             # Core 3D engine, physics, routing, and HTML UI
│   ├── index.css           # Glassmorphism styling & keyframe animations
│   ├── main.jsx            # React root injection
│   └── App.css             # Base application styles
├── package.json            # Dependencies (@react-three/fiber, three, etc.)
├── vite.config.js          # Vite bundler configuration
└── README.md
```

---

## 🛠️ Technology Stack

* **Core Engine:** React + Vite
* **3D Rendering:** Three.js
* **React Abstraction:** React Three Fiber (`@react-three/fiber`)
* **Helpers & Controls:** Drei (`@react-three/drei`)
* **Visual Effects:** Postprocessing (`@react-three/postprocessing`)

---

## 🤝 Contributing

Suggestions, bug reports, and improvements to the physics engine are always welcome.

Feel free to create an issue or submit a pull request.

---

## 👨‍💻 Author

**Your Name**  
*Internship Presentation - Phoenix Team*

Built to answer the question: 
> "Can we make a PowerPoint presentation feel like a sci-fi movie?" 😄
