import { MNIST_SAMPLE_MANIFEST_URL } from '../../config/config.js';

async function loadMnistTestSamples(manifestPath = MNIST_SAMPLE_MANIFEST_URL) {
  const manifestUrl = new URL(manifestPath, window.location.href);
  const manifestResponse = await fetch(manifestUrl.toString());
  if (!manifestResponse.ok) {
    throw new Error(`Could not load MNIST manifest (${manifestResponse.status}).`);
  }
  const manifest = await manifestResponse.json();
  const rows = Number(manifest?.imageShape?.[0]) || 28;
  const cols = Number(manifest?.imageShape?.[1]) || 28;
  const numSamples = Number(manifest?.numSamples) || 0;
  const sampleSize = rows * cols;
  const imageFile = manifest?.image?.file;
  const labelFile = manifest?.labels?.file;
  if (!imageFile || !labelFile) {
    throw new Error("Manifest does not contain valid file paths for images or labels.");
  }

  const [imageBuffer, labelBuffer] = await Promise.all([
    fetch(new URL(imageFile, manifestUrl).toString()).then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load MNIST image data (${response.status}).`);
      }
      return response.arrayBuffer();
    }),
    fetch(new URL(labelFile, manifestUrl).toString()).then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load MNIST label data (${response.status}).`);
      }
      return response.arrayBuffer();
    }),
  ]);

  const imageBytes = new Uint8Array(imageBuffer);
  const labelBytes = new Uint8Array(labelBuffer);
  if (numSamples <= 0) {
    if (sampleSize > 0) {
      const inferredSamples = Math.floor(imageBytes.length / sampleSize);
      if (inferredSamples <= 0) {
        throw new Error("Could not infer sample size from MNIST image data.");
      }
      if (labelBytes.length !== inferredSamples) {
        throw new Error("Number of labels does not match inferred samples.");
      }
    } else {
      throw new Error("Manifest does not contain valid sample size.");
    }
  }

  const totalSamples = numSamples > 0 ? numSamples : Math.floor(imageBytes.length / sampleSize);
  if (imageBytes.length !== totalSamples * sampleSize) {
    throw new Error("MNIST image data length does not match expected size.");
  }
  if (labelBytes.length !== totalSamples) {
    throw new Error("MNIST label data length does not match expected size.");
  }

  const digitBuckets = Array.from({ length: 10 }, () => []);
  for (let index = 0; index < totalSamples; index += 1) {
    const digit = labelBytes[index];
    if (digitBuckets[digit]) {
      digitBuckets[digit].push(index);
    }
  }

  const pixelCache = new Map();
  const normaliseSlice = (index) => {
    if (pixelCache.has(index)) {
      return pixelCache.get(index);
    }
    const start = index * sampleSize;
    const slice = imageBytes.subarray(start, start + sampleSize);
    const normalized = new Float32Array(sampleSize);
    for (let i = 0; i < sampleSize; i += 1) {
      normalized[i] = slice[i] / 255;
    }
    pixelCache.set(index, normalized);
    return normalized;
  };

  return {
    rows,
    cols,
    sampleSize,
    totalSamples,
    getRandomSample(digit) {
      if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
      const bucket = digitBuckets[digit];
      if (!bucket || bucket.length === 0) return null;
      const randomIndex = bucket[Math.floor(Math.random() * bucket.length)];
      return this.getSampleByIndex(randomIndex);
    },
    getSampleByIndex(index) {
      if (!Number.isFinite(index) || index < 0 || index >= totalSamples) return null;
      const pixels = normaliseSlice(index);
      return {
        index,
        digit: labelBytes[index],
        pixels,
      };
    },
  };
}

async function setupMnistSampleButtons({ digitCanvas, onSampleApplied, manifestPath } = {}) {
  if (!digitCanvas || typeof digitCanvas.setPixels !== "function") return null;
  const interactionRow =
    typeof digitCanvas.getInteractionRow === "function" ? digitCanvas.getInteractionRow() : null;
  const gridElement =
    typeof digitCanvas.getGridElement === "function" ? digitCanvas.getGridElement() : null;
  if (!interactionRow || !gridElement) return null;
  let loader;
  try {
    loader = await loadMnistTestSamples(manifestPath ?? MNIST_SAMPLE_MANIFEST_URL);
  } catch (error) {
    console.warn("Could not load MNIST test data:", error);
    return null;
  }
  const column = document.createElement("div");
  column.className = "digit-button-column";
  for (let digit = 0; digit < 10; digit += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "digit-button";
    button.textContent = String(digit);
    button.setAttribute("aria-label", `Zufällige ${digit} laden`);
    button.addEventListener("click", () => {
      const sample = loader.getRandomSample(digit);
      if (!sample) return;
      digitCanvas.setPixels(sample.pixels);
      if (typeof onSampleApplied === "function") {
        onSampleApplied(sample);
      }
  });
    column.appendChild(button);
  }
  interactionRow.appendChild(column);
  return {
    loader,
    column,
  };
}

export { loadMnistTestSamples, setupMnistSampleButtons };
