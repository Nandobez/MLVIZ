class FeedForwardModel {
  constructor(definition) {
    if (!definition.layers?.length) {
      throw new Error("Die Netzwerkdefinition muss Schichten enthalten.");
    }
    this.normalization = definition.normalization ?? { mean: 0, std: 1 };
    this.architecture = Array.isArray(definition.architecture)
      ? definition.architecture.slice()
      : this.computeArchitecture(definition.layers);
    this.layers = definition.layers.map((layer, index) => this.normaliseLayer(layer, index));
  }

  computeArchitecture(layers) {
    if (!layers.length) return [];
    const architecture = [];
    const firstLayer = layers[0];
    architecture.push(firstLayer.weights[0]?.length ?? 0);
    for (const layer of layers) {
      architecture.push(layer.biases.length);
    }
    return architecture;
  }

  normaliseLayer(layer, index) {
    if (!layer || !Array.isArray(layer.weights) || layer.weights.length === 0) {
      throw new Error(`Layer ${index} is missing valid weight matrices.`);
    }
    const weights = layer.weights.map((row) => {
      if (row instanceof Float32Array) {
        return new Float32Array(row);
      }
      if (Array.isArray(row)) {
        return Float32Array.from(row);
      }
      throw new Error(`Layer ${index} contains an invalid weight row.`);
    });
    let biases;
    if (layer.biases instanceof Float32Array) {
      biases = new Float32Array(layer.biases);
    } else if (Array.isArray(layer.biases)) {
      biases = Float32Array.from(layer.biases);
    } else {
      biases = new Float32Array(weights.length > 0 ? weights[0].length : 0);
    }
    return {
      name: typeof layer.name === "string" ? layer.name : `dense_${index}`,
      activation: typeof layer.activation === "string" ? layer.activation : "relu",
      weights,
      biases,
    };
  }

  updateLayers(layerDefinitions) {
    if (!Array.isArray(layerDefinitions) || layerDefinitions.length === 0) {
      throw new Error("Neue Layerdefinitionen müssen mindestens eine Schicht enthalten.");
    }
    this.layers = layerDefinitions.map((layer, index) => this.normaliseLayer(layer, index));
    this.architecture = this.computeArchitecture(this.layers);
  }

  propagate(pixels) {
    const { mean, std } = this.normalization;
    const input = new Float32Array(pixels.length);
    for (let i = 0; i < pixels.length; i += 1) {
      input[i] = (pixels[i] - mean) / std;
    }

    const activations = [input];
    const preActivations = [];
    let current = input;

    for (const layer of this.layers) {
      const outSize = layer.biases.length;
      const linear = new Float32Array(outSize);

      for (let neuron = 0; neuron < outSize; neuron += 1) {
        let sum = layer.biases[neuron];
        const weights = layer.weights[neuron];
        for (let source = 0; source < weights.length; source += 1) {
          sum += weights[source] * current[source];
        }
        linear[neuron] = sum;
      }

      preActivations.push(linear);
      let activated;
      if (layer.activation === "relu") {
        activated = new Float32Array(outSize);
        for (let i = 0; i < outSize; i += 1) {
          activated[i] = linear[i] > 0 ? linear[i] : 0;
        }
      } else {
        activated = linear.slice();
      }
      activations.push(activated);
      current = activated;
    }

    return {
      normalizedInput: activations[0],
      activations,
      preActivations,
    };
  }
}

export { FeedForwardModel };
