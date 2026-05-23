<div align="center">

<pre>
  ███╗   ███╗██╗    ██╗   ██╗██╗███████╗
  ████╗ ████║██║    ██║   ██║██║╚══███╔╝
 ██╔████╔██║██║    ██║   ██║██║  ███╔╝
██║╚██╔╝██║██║    ╚██╗ ██╔╝██║ ███╔╝
  ██║ ╚═╝ ██║███████╗╚████╔╝ ██║███████╗
  ╚═╝     ╚═╝╚══════╝ ╚═══╝  ╚═╝╚══════╝
</pre>

### Interactive 3D Neural Network Visualiser — MNIST MLP

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![PyTorch](https://img.shields.io/badge/PyTorch-CPU-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![Three.js](https://img.shields.io/badge/Three.js-r181-000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org)

</div>

Draw a digit on the canvas and watch a small MLP think out loud in 3D: every neuron lights up with its activation, every weight is a glowing edge, and the prediction probabilities update as you draw. The network is trained offline in PyTorch and exported as a single JSON manifest that the browser streams into a live Three.js scene.

## Features

- **3D neural network** — `Three.js` (via `@react-three/fiber` + `drei`) renders the full MLP, neurons sized by activation, edges coloured by weight sign/magnitude.
- **Draw-to-predict** — sketch a digit, see the activations propagate and the soft-max probabilities react in real time.
- **Timeline scrubber** — every export keeps milestones from the training run, so you can rewind from random init to final weights.
- **MNIST sample browser** — pick a real test image to feed the network instead of drawing.
- **Bilingual UI** — EN / PT-BR live toggle.
- **Offline ML pipeline** — Python script trains the MLP and dumps a single JSON; no runtime backend required.

## Architecture

```
┌────────────────────────────┐        ┌────────────────────────────┐
│   Python (offline)         │        │ React + Three.js (browser) │
│                            │        │                            │
│   training/mlp_train.py    │        │   App.jsx                  │
│   tools/.../mnist_assets   │        │   ├─ DigitCanvas           │
│       │                    │        │   ├─ NeuralVisualization3D │
│       │  exports JSON+bin  │        │   ├─ ProbabilityPanel      │
│       ▼                    │        │   ├─ Timeline              │
│   public/exports/*.json    │ ─────▶ │   └─ NeuronDetailPanel     │
│   public/data/*.bin        │ fetch  │                            │
└────────────────────────────┘        └────────────────────────────┘
```

## Quick start

```bash
# One-shot: install Node + Python deps, then start dev server
./run.sh --install
./run.sh

# Or retrain + run in one command
./run.sh --train --epochs 10
```

Open <http://localhost:5173>.

### `run.sh` flags

| Command                         | What it does                                    |
|---------------------------------|-------------------------------------------------|
| `./run.sh`                      | Vite dev server (front only)                    |
| `./run.sh --train [args]`       | Retrain MLP, re-export weights, then dev        |
| `./run.sh --export-only`        | Train + export, no front                        |
| `./run.sh --build`              | Production build (`vite build`)                 |
| `./run.sh --install`            | Set up `node_modules` + `.venv` with torch CPU  |

Extra args after `--train` are forwarded to `mlp_train.py` (e.g. `--epochs`, `--hidden-dims 128 64`, `--lr`).

## Project layout

```
mlviz/
├── README.md
├── LICENSE
├── run.sh                       # unified launcher
├── package.json                 # React 19 + Vite 7 + Three.js
├── vite.config.js
├── index.html
├── public/
│   ├── data/                    # MNIST test blobs (uint8 .bin + manifest)
│   └── exports/                 # exported weights JSON (loaded by app)
├── src/
│   ├── App.jsx · main.jsx
│   ├── components/              # DigitCanvas, NeuralVisualization3D,
│   │                            # ProbabilityPanel, NeuronDetailPanel, ...
│   ├── hooks/useI18n.jsx
│   ├── services/                # neural-visualizer (Three.js), digit-canvas
│   ├── config/                  # translations, constants
│   └── utils/                   # format-utils, network-utils
├── training/
│   └── mlp_train.py             # PyTorch trainer + JSON exporter
└── tools/
    └── mnist_assets/
        └── prepare_mnist_test_assets.py
```

## Tech stack

- **Front**: React 19, Vite 7, Three.js r181, `@react-three/fiber`, `@react-three/drei`, Sass
- **Back (offline)**: Python 3.12, PyTorch (CPU build), torchvision, NumPy

## Author

Fernando Bezerra — [@Nandobez](https://github.com/Nandobez)

## License

[MIT](./LICENSE).
