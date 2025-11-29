import React, { useEffect, useState } from 'react';
import { loadMnistTestSamples } from '../services/data/mnist-loader';
import { MNIST_SAMPLE_MANIFEST_URL } from '../config/config';
import Button from './ui/Button';

export function MnistSampleButtons({ onSampleApplied, digitCanvasRef }) {
  const [loader, setLoader] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initLoader() {
      try {
        const loadedLoader = await loadMnistTestSamples(MNIST_SAMPLE_MANIFEST_URL);
        setLoader(loadedLoader);
      } catch (error) {
        console.warn("Could not load MNIST test data:", error);
      } finally {
        setLoading(false);
      }
    }
    initLoader();
  }, []);

  const handleDigitClick = (digit) => {
    if (!loader || !onSampleApplied) return;

    const sample = loader.getRandomSample(digit);
    if (!sample) return;

    // If we have a ref to the canvas, we can set pixels directly
    if (digitCanvasRef && digitCanvasRef.current) {
        digitCanvasRef.current.setPixels(sample.pixels);
    }

    onSampleApplied(sample);
  };

  if (loading) return null; // Or a loading spinner
  if (!loader) return null; // Failed to load

  return (
    <div className="digit-button-grid">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
        <Button
          key={digit}
          theme="SECONDARY"
          onClick={() => handleDigitClick(digit)}
          style={{ width: '100%', height: '100%', padding: '0' }}
        >
          [{digit}]
        </Button>
      ))}
    </div>
  );
}
