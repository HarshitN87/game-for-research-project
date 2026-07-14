# Signal Run — Shirt Merch Acquisition Study

An effort-versus-credit research prototype built by adapting the MIT-licensed [`mohsenheydari/three-fps`](https://github.com/mohsenheydari/three-fps) WebGL source project.

This repository is maintained at: [HarshitN87/game-for-research-project](https://github.com/HarshitN87/game-for-research-project).

## What Participants Experience

1. They consent and are randomly assigned to an **Effort Route** or a **Credit Route**.
2. They are shown a large, readable preview of the **Signal Run Crew Tee** merchandise: a cyan-and-violet shirt carrying the `SIGNAL RUN` and `OWN THE RUN` chest logo.
3. The effort group unlocks the shirt after clearing three escalating FPS rounds. The credit group spends 300 **experimental credits** before playing the exact same rounds with the shirt already equipped.
4. During every round, the shirt remains clearly visible in the upper-right merch panel. The game tracks completed rounds, shots, targets, and Signal score.
5. Participants complete a post-play 1–7 scale survey. Their anonymised response can be downloaded as JSON and is also saved locally in that browser.

This prototype does not process payment, transmit data, or collect names/contact details.

---

## Technical Features Implemented

* **Segmented Block Mannequin:** Replaced the heavy, static FBX skeleton meshes with a fully animated, custom procedural block character featuring human-like proportions (neck, segmented thighs/shins, upper/lower arms, and hands) and face details (mohawk hair, ears, nose, and glowing eyes).
* **Adaptive Customizer Styles:** The block character's shirt, trousers, boots, and headgear dynamically update their colors and geometries (e.g., ninja wraps, NVG goggles, medic vests, hood capes) to match user customization choices.
* **Realistic Weapon Handling:** The AK47 rifle is scaled and nested directly inside the right hand block. Both arms pivot dynamically (right hand on the grip, left hand supporting the barrel) to maintain a realistic two-handed shooting stance.
* **Mutant Drop-Ammo System:** Defeated mutants spawn a physical, collectible ammo box at their coordinates, letting players replenish ammunition mid-game.
* **Safe Pathfinding & Reload Safeguards:** Added try-catch guards to both the `three-pathfinding` navmesh queries (recovering gracefully if mutants get pushed off-mesh) and the weapon FSM reload transition loop, preventing runtime crashes.

---

## Run Locally

```powershell
npm install
npm start
```

Open the URL printed by Webpack (normally `http://localhost:8080`). For a production build:

```powershell
npm run build
```

The npm scripts include the legacy OpenSSL compatibility setting required by this Webpack source on current Node.js releases.

---

## Test the Study Conditions

- `http://localhost:8080/?condition=effort` (Forces the effort-based shirt unlock route)
- `http://localhost:8080/?condition=money` (Forces the credit-purchase shirt unlock route)

Without a parameter, condition assignment uses the browser's cryptographic random number generator.

---

## Vercel Deployment Instructions

This project is fully optimized for **Vercel** serverless hosting:

1. Log in or sign up at [Vercel.com](https://vercel.com/) (select **Continue with GitHub**).
2. Click **Add New...** and select **Project**.
3. Under *Import Git Repository*, locate `game-for-research-project` and click **Import**.
4. Leave all settings at their defaults. Vercel automatically reads `vercel.json` in the root to configure:
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
5. Click **Deploy**. Vercel will provide you with a live public URL.
6. Every time you push changes to the `main` branch of this repository, Vercel will rebuild and redeploy your project automatically.

---

## Research Deployment Notes

Browser local storage is appropriate for prototype testing only. Before fielding a real study, replace it with an approved study backend and have your research team validate consent wording, participant withdrawal, data retention, eligibility, randomisation, debriefing, and all ethics/IRB requirements.

---

## Attribution and Licence

The original FPS code is © 2021 Mohsen Heydari and remains under the [MIT License](LICENSE). Its original bundled assets retain their separate source licences/attribution requirements:

- AK47 model by kursat_sokmen — CC BY 4.0
- Metal Ammo Box model by TheoClarke — CC BY 4.0
- Mutant model/animations from Mixamo
- Veld Fire sky environment by Greg Zaal — CC0

The added Signal Run research flow and CSS-rendered Crew Tee design are original prototype work. They do not use Fortnite characters, logos, or artwork.
