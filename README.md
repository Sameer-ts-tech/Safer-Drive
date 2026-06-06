# Safer-Drive 🏎️📱

Safer-Drive is a premium mobile telematics console built with **Expo SDK 55**, TypeScript, and React Native. It leverages device sensors (accelerometer, gyroscope, device motion, and GPS) to analyze real-time driving behavior, detect hazardous safety events (such as harsh braking, sharp turns, and phone handling), calculate a dynamic driving score, and provide AI-powered coaching feedback.

---

## 🎥 Demo & Walkthrough

Check out the full application walkthrough and demo on X (formerly Twitter):
👉 **[Watch the Safer-Drive Demo Video](https://x.com/Sameer_1_1_9/status/2063330414228623420?s=20)**

---

## 🎨 Premium Visual Identity & Design System

The console is designed around a modern, dark-themed **Adobe Color Palette** utilizing glassmorphism panels, animated transitions, SVG elements, and standard vector symbols (with no raw emojis in the interface):

- **Primary Background (`#372E2D` / `#1E1615`)**: Deep warm charcoal.
- **Surface Panels (`#5C423E`)**: Medium-dark brown for card boundaries.
- **Accents & Highlights (`#C9958D`, `#EE9385`, `#FF7E6A`)**: Sleek warm pinks and vibrant coral gradients for interactive actions and rings.
- **Telemetry Alerts (`#AF4C3C`, `#FF5E46`)**: High-contrast warm red tones highlighting hazardous driving metrics and event points.

---

## 🔬 Telemetry & Physics-Based Event Pipeline

The core driving analyzer runs on a mathematical DSP (Digital Signal Processing)

1. **Gravity Isolation Vector (Low-Pass Filtering)**:
   Extracts gravity vectors from high-frequency accelerations using an Exponential Moving Average (EMA):
   $$g_{est} = \alpha \cdot a_{raw} + (1 - \alpha) \cdot g_{est}$$
   This ensures G-force calculations remain stable and tilt-invariant.
2. **Horizontal Plane Projections**:
   Projects linear force components orthogonally to the gravity vector to determine lateral (left/right cornering) and longitudinal (braking/acceleration) G-forces regardless of device mounting angle.
3. **Event Detection & Scoring Deductions**:
   - **Harsh Braking** (Longitudinal Deceleration $a_{long} < -0.28G$, sustained for $\ge 0.4$s) $\rightarrow$ **-5 pts**
   - **Harsh Acceleration** (Longitudinal Acceleration $a_{long} > 0.26G$, sustained for $\ge 0.5$s) $\rightarrow$ **-5 pts**
   - **Sharp Turns** (Lateral Force $|a_{lat}| > 0.3G$ + Yaw Rate $|\omega_{yaw}| > 23^\circ$/s, sustained for $\ge 0.5$s) $\rightarrow$ **-3 pts**
   - **Aggressive Steering (Swerve)** (Lateral Jerk rate $>6.0 \text{ m/s}^3$ with rapid polarity changes) $\rightarrow$ **-4 pts**
   - **Excessive Phone Vibration** (High-frequency noise in both acceleration and angular rotation) $\rightarrow$ **-2 pts**
   - **Phone Handling/Distraction** (Phone tilts $>15^\circ$ with rapid angular rotation, indicating handheld usage) $\rightarrow$ **-10 pts**

---

## 🌟 Core Features

- **Start & End Driving HUD**:
  - Live timer, speed, distance, and event counters.
  - Interactive **Friction Circle G-force Meter** displaying real-time vector components and peak-G limits.
  - **Dynamic Warning Banner**: Slides down immediately when a driving infraction occurs, displaying a styled alert card with its corresponding vector icon.
- **Advanced 3-Layer Failover Sensor Pipeline**:
  - *Layer 1*: Leverages Expo `DeviceMotion` sensor data.
  - *Layer 2*: Fails over to raw `Accelerometer` and `Gyroscope` streams (bypassing native OS motion sheets).
  - *Layer 3*: GPS-based emulation loop for simulators without hardware gyroscopes.
- **TTS Real-Time Coaching**:
  - Real-time driving voice alert announcements utilizing `expo-speech` (e.g., announcing *"Warning: Harsh Brake Detected"*).
- **Post-Drive Summary Screen**:
  - Interactive **SVG Path Replay Map** that projects coordinate scales, renders path segments color-coded by G-force intensity (Smooth $\rightarrow$ Heavy), flags event nodes, and includes an interactive scrubber slider.
  - **Coaching AI**: Generates custom feedback utilizing the Gemini 1.5/2.5 Flash API if a user saves an API key in Settings; otherwise, falls back to a rules-based coaching model.
- **History & Settings Tabs**:
  - SVG line chart showing safety trends over the last 10 drives.
  - Ability to change sensitivity parameters (Conservative, Standard, Aggressive).
  - Live raw telemetry stream terminal console displaying real-time x/y/z values.
  - Local database purge option.

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- Expo Go app installed on your physical device, or Xcode/Android Studio simulator.

### Getting Started

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Start the Metro Bundler**:
   ```bash
   npx expo start
   ```

3. **Run on your device**:
   - Scan the QR code in the terminal using the Expo Go app.
   - For simulators, press `a` (Android) or `i` (iOS).

4. **Simulate a Test Drive (No Car Required!)**:
   If you are testing on a desktop emulator, click the **"Simulate"** button on the Home Dashboard tab to instantly generate a 5-minute simulated route with coordinates, speed curves, G-force heatmaps, and safety events.

---

## 🧪 Testing & Verification

Run TypeScript compilation checks to verify type-safety:
```bash
npx tsc --noEmit
```
All components are fully typed, verified, and compile successfully without any error outputs.
