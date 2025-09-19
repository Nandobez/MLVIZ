import { clamp, maxAbsValue } from '../utils/math-utils.js';
import { FpsMonitor } from './ui/fps-monitor.js';

class NeuralVisualizer {
  constructor(mlp, options) {
    this.mlp = mlp;
    this.options = Object.assign(
      {
        layerSpacing: 5.5,
        inputSpacing: 0.24,
        hiddenSpacing: 0.95,
        outputSpacing: 0.95,
        inputNodeSize: 0.18,
        hiddenNodeRadius: 0.22,
        maxConnectionsPerNeuron: 24,
        connectionRadius: 0.005,
        connectionWeightThreshold: 0,
        outputLabelOffset: 0.65,
        outputLabelScale: 0.48,
        showFpsOverlay: false,
      },
      options || {},
    );
    this.focusChangeCallback =
      typeof this.options.onNeuronFocusChange === "function" ? this.options.onNeuronFocusChange : null;
    this.t = typeof this.options.t === "function" ? this.options.t : (key, def) => def || key;
    delete this.options.onNeuronFocusChange;
    delete this.options.t;
    this.layerMeshes = [];
    this.connectionGroups = [];
    this.selectionConnectionGroups = [];
    this.tempObject = new THREE.Object3D();
    this.tempColor = new THREE.Color();
    this.tempQuaternion = new THREE.Quaternion();
    this.upVector = new THREE.Vector3(0, 1, 0);
    this.highlightColor = new THREE.Color(0x4da6ff);
    this.outputLabels = [];
    this.selectedNeuron = null;
    this.lastDisplayActivations = null;
    this.lastNetworkActivations = null;
    this.lastPreActivations = null;
    this.currentSelectionDetail = null;
    this.selectionCylinderGeometry = null;
    this.selectionConnectionRadiusMultiplier = 1.2;
    this.selectionConnectionData = null;
    this.selectionGlowSprite = null;
    this.maxConnectionWeightMagnitude = 0;
    this.raycaster = new THREE.Raycaster();
    this.pointerVector = new THREE.Vector2();
    this.pointerDown = null;
    this.initThreeScene();
    this.buildLayers();
    this.buildConnections();
    this.animate();
  }

  initThreeScene() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const container = this.options.container || document.body;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.fpsMonitor = this.options.showFpsOverlay ? new FpsMonitor() : null;

    this.labelGroup = new THREE.Group();
    this.scene.add(this.labelGroup);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(-15, 0, 15);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 52;
    this.controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambient);
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x1a1d2e, 0.9);
    hemisphere.position.set(0, 20, 0);
    this.scene.add(hemisphere);
    const directional = new THREE.DirectionalLight(0xffffff, 1.4);
    directional.position.set(18, 26, 24);
    directional.castShadow = true;
    this.scene.add(directional);
    const fillLight = new THREE.DirectionalLight(0xa8c5ff, 0.8);
    fillLight.position.set(-20, 18, -18);
    this.scene.add(fillLight);
    const rimLight = new THREE.PointLight(0x88a4ff, 0.6, 60, 1.6);
    rimLight.position.set(0, 12, -24);
    this.scene.add(rimLight);

    this.renderer.domElement.addEventListener("pointerdown", (event) => this.handleScenePointerDown(event));
    this.renderer.domElement.addEventListener("pointerup", (event) => this.handleScenePointerUp(event));

    // Bind resize handler so we can remove it later if needed, though here we just add it
    this.resizeHandler = () => this.handleResize();
    window.addEventListener("resize", this.resizeHandler);

    window.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        this.clearSelection();
      }
    });
  }

  handleResize() {
    if (!this.camera || !this.renderer) return;

    const container = this.options.container || document.body;
    // Force a reflow/recalc if needed, or just trust the rect
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  handleScenePointerDown(event) {
    if (!event.isPrimary && event.isPrimary !== undefined) return;
    if (event.button !== 0) return;
    this.pointerDown = { x: event.clientX, y: event.clientY };
  }

  handleScenePointerUp(event) {
    if (!event.isPrimary && event.isPrimary !== undefined) return;
    if (event.button !== 0) return;
    if (!this.pointerDown) return;
    const dx = event.clientX - this.pointerDown.x;
    const dy = event.clientY - this.pointerDown.y;
    this.pointerDown = null;
    const distance = Math.hypot(dx, dy);
    if (distance > 4) return;
    this.trySelectNeuron(event);
  }

  trySelectNeuron(event) {
    if (!this.layerMeshes.length || !this.camera) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointerVector.set(x, y);
    this.raycaster.setFromCamera(this.pointerVector, this.camera);

    const intersections = [];
    this.layerMeshes.forEach((layer, layerIndex) => {
      if (!layer?.mesh) return;
      const hits = this.raycaster.intersectObject(layer.mesh, false);
      hits.forEach((hit) => {
        if (Number.isInteger(hit.instanceId)) {
          intersections.push({
            distance: hit.distance,
            layerIndex,
            neuronIndex: hit.instanceId,
          });
        }
      });
    });
    intersections.sort((a, b) => a.distance - b.distance);
    const hit = intersections[0];
    if (!hit) {
      this.clearSelection();
      return;
    }
    this.setSelectedNeuron(hit.layerIndex, hit.neuronIndex);
  }

  setSelectedNeuron(layerIndex, neuronIndex) {
    if (!Number.isInteger(layerIndex) || !Number.isInteger(neuronIndex)) return;
    const layer = this.layerMeshes[layerIndex];
    if (!layer) return;
    const boundedIndex = Math.max(0, Math.min(layer.positions.length - 1, neuronIndex));
    if (
      this.selectedNeuron &&
      this.selectedNeuron.layerIndex === layerIndex &&
      this.selectedNeuron.neuronIndex === boundedIndex
    ) {
      this.clearSelection();
      return;
    }
    this.selectedNeuron = { layerIndex, neuronIndex: boundedIndex };
    this.updateConnectionVisibility();
    this.buildSelectionConnectionMeshes();
    if (this.lastDisplayActivations && this.lastNetworkActivations) {
      this.update(this.lastDisplayActivations, this.lastNetworkActivations, this.lastPreActivations);
    } else if (typeof this.requestRender === "function") {
      this.requestRender();
    }
  }

  clearSelection() {
    if (!this.selectedNeuron) return;
    this.selectedNeuron = null;
    this.selectionConnectionData = null;
    this.currentSelectionDetail = null;
    this.disposeSelectionConnectionMeshes();
    this.updateConnectionVisibility();
    this.hideSelectionGlow();
    if (typeof this.focusChangeCallback === "function") {
      this.focusChangeCallback(null);
    }
    if (this.lastDisplayActivations && this.lastNetworkActivations) {
      this.update(this.lastDisplayActivations, this.lastNetworkActivations, this.lastPreActivations);
    } else if (typeof this.requestRender === "function") {
      this.requestRender();
    }
  }

  updateConnectionVisibility() {
    const showDefaultConnections = !this.selectedNeuron;
    this.connectionGroups.forEach((group) => {
      if (!group?.mesh) return;
      group.mesh.visible = showDefaultConnections;
    });
  }

  ensureSelectionGeometry() {
    if (!this.selectionCylinderGeometry) {
      const baseRadius = this.options.connectionRadius ?? 0.02;
      const radius = baseRadius * this.selectionConnectionRadiusMultiplier;
      this.selectionCylinderGeometry = new THREE.CylinderGeometry(radius, radius, 1, 16, 1, true);
    }
    return this.selectionCylinderGeometry;
  }

  buildSelectionConnectionMeshes() {
    this.disposeSelectionConnectionMeshes();
    if (!this.selectedNeuron) return;
    const data = this.collectSelectionConnectionData();
    this.selectionConnectionData = data;
    const baseGeometry = this.ensureSelectionGeometry();
    const connectionMaterial = new THREE.MeshBasicMaterial({
      toneMapped: false,
    });

    const createMesh = (connections) => {
      if (!connections.length) return null;
      const mesh = new THREE.InstancedMesh(baseGeometry.clone(), connectionMaterial.clone(), connections.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const colorAttribute = new THREE.InstancedBufferAttribute(new Float32Array(connections.length * 3), 3);
      colorAttribute.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = colorAttribute;
      connections.forEach((connection, index) => {
        const direction = connection.targetPosition.clone().sub(connection.sourcePosition);
        const length = direction.length();
        if (length <= 0) {
          return;
        }
        const midpoint = connection.sourcePosition.clone().addScaledVector(direction, 0.5);
        this.tempObject.position.copy(midpoint);
        this.tempQuaternion.setFromUnitVectors(this.upVector, direction.clone().normalize());
        this.tempObject.quaternion.copy(this.tempQuaternion);
        this.tempObject.scale.set(1, length, 1);
        this.tempObject.updateMatrix();
        mesh.setMatrixAt(index, this.tempObject.matrix);
        mesh.setColorAt(index, this.tempColor.setRGB(0.8, 0.8, 0.8));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      return mesh;
    };

    if (data.incoming.length) {
      const mesh = createMesh(data.incoming);
      if (mesh) {
        this.scene.add(mesh);
        this.selectionConnectionGroups.push({
          mesh,
          connections: data.incoming,
          direction: "incoming",
        });
      }
    }
    if (data.outgoing.length) {
      const mesh = createMesh(data.outgoing);
      if (mesh) {
        this.scene.add(mesh);
        this.selectionConnectionGroups.push({
          mesh,
          connections: data.outgoing,
          direction: "outgoing",
        });
      }
    }
    this.updateSelectionGlow();
  }

  disposeSelectionConnectionMeshes() {
    if (!Array.isArray(this.selectionConnectionGroups)) {
      this.selectionConnectionGroups = [];
      return;
    }
    this.selectionConnectionGroups.forEach((group) => {
      if (!group?.mesh) return;
      this.scene.remove(group.mesh);
      const material = group.mesh.material;
      if (Array.isArray(material)) {
        material.forEach((mat) => {
          if (mat && typeof mat.dispose === "function") mat.dispose();
        });
      } else if (material && typeof material.dispose === "function") {
        material.dispose();
      }
      if (group.mesh.geometry && typeof group.mesh.geometry.dispose === "function") {
        group.mesh.geometry.dispose();
      }
    });
    this.selectionConnectionGroups = [];
  }

  collectSelectionConnectionData() {
    if (!this.selectedNeuron) {
      return { incoming: [], outgoing: [], bias: 0, previousLayerSize: null, nextLayerSize: null };
    }
    const { layerIndex, neuronIndex } = this.selectedNeuron;
    const targetLayerMesh = this.layerMeshes[layerIndex];
    const targetPosition = targetLayerMesh?.positions?.[neuronIndex];
    const incoming = [];
    const outgoing = [];
    const minMagnitude = Math.max(0, this.options.connectionWeightThreshold ?? 0);
    let bias = null;
    let previousLayerSize = null;
    let nextLayerSize = null;

    if (layerIndex > 0 && this.mlp.layers[layerIndex - 1]) {
      const prevLayerMesh = this.layerMeshes[layerIndex - 1];
      const weightLayer = this.mlp.layers[layerIndex - 1];
      const weights = weightLayer.weights?.[neuronIndex];
      bias = weightLayer.biases?.[neuronIndex] ?? 0;
      if (weights && targetPosition) {
        previousLayerSize = weights.length;
        for (let sourceIndex = 0; sourceIndex < weights.length; sourceIndex += 1) {
          const sourcePosition = prevLayerMesh?.positions?.[sourceIndex];
          if (!sourcePosition) continue;
          const weight = Number(weights[sourceIndex]);
          if (!Number.isFinite(weight)) continue;
          if (Math.abs(weight) < minMagnitude) continue;
          incoming.push({
            sourceLayer: layerIndex - 1,
            targetLayer: layerIndex,
            sourceIndex,
            targetIndex: neuronIndex,
            weight,
            sourcePosition,
            targetPosition,
          });
        }
      }
    }

    if (layerIndex < this.layerMeshes.length - 1 && this.mlp.layers[layerIndex]) {
      const nextLayerMesh = this.layerMeshes[layerIndex + 1];
      const weightLayer = this.mlp.layers[layerIndex];
      const weights = weightLayer.weights ?? [];
      nextLayerSize = weights.length;
      const sourcePosition = targetPosition;
      for (let targetIndex = 0; targetIndex < weights.length; targetIndex += 1) {
        const row = weights[targetIndex];
        if (!row || sourcePosition == null) continue;
        const targetPosition = nextLayerMesh?.positions?.[targetIndex];
        if (!targetPosition) continue;
        const weight = Number(row[neuronIndex]);
        if (!Number.isFinite(weight)) continue;
        if (Math.abs(weight) < minMagnitude) continue;
        outgoing.push({
          sourceLayer: layerIndex,
          targetLayer: layerIndex + 1,
          sourceIndex: neuronIndex,
          targetIndex,
          weight,
          sourcePosition,
          targetPosition,
        });
      }
    }

    return { incoming, outgoing, bias, previousLayerSize, nextLayerSize };
  }

  ensureSelectionGlowSprite() {
    if (this.selectionGlowSprite) return this.selectionGlowSprite;
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, size, size);
      const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.5);
      gradient.addColorStop(0, "rgba(77, 166, 255, 0.95)");
      gradient.addColorStop(0.35, "rgba(39, 132, 255, 0.7)");
      gradient.addColorStop(1, "rgba(18, 64, 158, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.anisotropy = 2;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      opacity: 0.95,
      toneMapped: false,
      color: 0x4da6ff,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.renderOrder = 10;
    this.scene.add(sprite);
    this.selectionGlowSprite = sprite;
    return sprite;
  }

  updateSelectionGlow() {
    if (!this.selectedNeuron) {
      this.hideSelectionGlow();
      return;
    }
    const { layerIndex, neuronIndex } = this.selectedNeuron;
    const layer = this.layerMeshes[layerIndex];
    const position = layer?.positions?.[neuronIndex];
    if (!layer || !position) {
      this.hideSelectionGlow();
      return;
    }
    const sprite = this.ensureSelectionGlowSprite();
    sprite.position.copy(position);
    const baseSize =
      layer.type === "input"
        ? this.options.inputNodeSize ?? 0.18
        : this.options.hiddenNodeRadius ?? 0.22;
    const scale = Math.max(baseSize * 3, 0.2);
    sprite.scale.set(scale, scale, 1);
    sprite.visible = true;
  }

  hideSelectionGlow() {
    if (!this.selectionGlowSprite) return;
    this.selectionGlowSprite.visible = false;
  }

  updateSelectionVisuals() {
    if (!this.selectedNeuron) return;
    if (!this.lastNetworkActivations) return;
    if (!this.selectionConnectionData) {
      this.selectionConnectionData = this.collectSelectionConnectionData();
    }
    this.updateSelectionGlow();
    const detail = this.buildSelectionDetail();
    this.currentSelectionDetail = detail;
    this.updateSelectedConnectionColors(detail);
    if (typeof this.focusChangeCallback === "function") {
      this.focusChangeCallback(detail);
    }
    if (typeof this.requestRender === "function") {
      this.requestRender();
    }
  }

  buildSelectionDetail() {
    if (!this.selectedNeuron) return null;
    const { layerIndex, neuronIndex } = this.selectedNeuron;
    const data = this.selectionConnectionData || this.collectSelectionConnectionData();
    const layerActivations = this.lastNetworkActivations?.[layerIndex] ?? null;
    const activationValue =
      Array.isArray(layerActivations) || layerActivations instanceof Float32Array
        ? layerActivations[neuronIndex] ?? null
        : null;
    const previousActivations =
      layerIndex > 0 ? this.lastNetworkActivations?.[layerIndex - 1] ?? null : null;
    const nextActivations =
      layerIndex < this.lastNetworkActivations.length - 1
        ? this.lastNetworkActivations?.[layerIndex + 1] ?? null
        : null;
    let sumContributions = 0;

    const incoming = data.incoming.map((connection) => {
      const sourceActivation =
        previousActivations && (previousActivations instanceof Float32Array || Array.isArray(previousActivations))
          ? previousActivations[connection.sourceIndex] ?? 0
          : 0;
      const contribution = sourceActivation * connection.weight;
      sumContributions += contribution;
      return {
        sourceIndex: connection.sourceIndex,
        weight: connection.weight,
        sourceActivation,
        contribution,
      };
    });

    const bias = data.bias ?? (layerIndex > 0 ? 0 : null);
    const preActivationFromModel =
      layerIndex > 0
        ? this.lastPreActivations?.[layerIndex - 1]?.[neuronIndex] ?? null
        : activationValue ?? null;
    const inferredPreActivation =
      bias !== null && bias !== undefined ? sumContributions + bias : sumContributions;
    const preActivation =
      preActivationFromModel !== null && preActivationFromModel !== undefined
        ? preActivationFromModel
        : inferredPreActivation;

    const outgoingContributionBase = Number.isFinite(activationValue) ? activationValue : 0;
    const outgoing = data.outgoing.map((connection) => {
      const targetActivation =
        nextActivations && (nextActivations instanceof Float32Array || Array.isArray(nextActivations))
          ? nextActivations[connection.targetIndex] ?? 0
          : 0;
      return {
        targetIndex: connection.targetIndex,
        weight: connection.weight,
        targetActivation,
        contribution: outgoingContributionBase * connection.weight,
      };
    });

    return {
      layerIndex,
      neuronIndex,
      layerLabel: this.describeLayer(layerIndex),
      activationName: this.getActivationName(layerIndex),
      activationValue: activationValue ?? null,
      preActivation,
      bias: bias ?? null,
      incoming,
      outgoing,
      previousLayerSize: data.previousLayerSize,
      nextLayerSize: data.nextLayerSize,
    };
  }

  updateSelectedConnectionColors(detail) {
    if (!detail) return;
    const incomingGroup = this.selectionConnectionGroups.find((group) => group.direction === "incoming");
    if (incomingGroup && detail.incoming.length === incomingGroup.connections.length) {
      const maxContribution = detail.incoming.reduce(
        (acc, item) => Math.max(acc, Math.abs(item.contribution)),
        0,
      );
      const scale = maxContribution > 1e-6 ? maxContribution : 1;
      detail.incoming.forEach((item, index) => {
        const normalized = clamp(item.contribution / scale, -1, 1);
        const magnitude = Math.abs(normalized);
        if (magnitude < 1e-4) {
          this.tempColor.setRGB(0.4, 0.4, 0.4);
        } else if (normalized >= 0) {
          this.tempColor.setRGB(0.2, 0.85 * magnitude + 0.15, 0.2);
        } else {
          this.tempColor.setRGB(0.85 * magnitude + 0.15, 0.2, 0.2);
        }
        incomingGroup.mesh.setColorAt(index, this.tempColor);
      });
      incomingGroup.mesh.instanceColor.needsUpdate = true;
    }

    const outgoingGroup = this.selectionConnectionGroups.find((group) => group.direction === "outgoing");
    if (outgoingGroup && detail.outgoing.length === outgoingGroup.connections.length) {
      const maxContribution = detail.outgoing.reduce(
        (acc, item) => Math.max(acc, Math.abs(item.contribution)),
        0,
      );
      const scale = maxContribution > 1e-6 ? maxContribution : 1;
      detail.outgoing.forEach((item, index) => {
        const normalized = clamp(item.contribution / scale, -1, 1);
        const magnitude = Math.abs(normalized);
        if (magnitude < 1e-4) {
          this.tempColor.setRGB(0.35, 0.35, 0.35);
        } else if (normalized >= 0) {
          this.tempColor.setRGB(0.25, 0.75 * magnitude + 0.25, 0.9);
        } else {
          this.tempColor.setRGB(0.9, 0.3, 0.85 * magnitude + 0.15);
        }
        outgoingGroup.mesh.setColorAt(index, this.tempColor);
      });
      outgoingGroup.mesh.instanceColor.needsUpdate = true;
    }
  }

  describeLayer(layerIndex) {
    if (layerIndex === 0) {
      return `${this.t('inputLayer', 'Input Layer')} (${this.mlp.architecture[layerIndex]} ${this.t('nodes', 'nodes')})`;
    }
    if (layerIndex === this.mlp.architecture.length - 1) {
      return `${this.t('outputLayer', 'Output Layer')} (${this.mlp.architecture[layerIndex]} ${this.t('nodes', 'nodes')})`;
    }
    return `${this.t('hiddenLayer', 'Hidden Layer')} ${layerIndex} (${this.mlp.architecture[layerIndex]} ${this.t('nodes', 'nodes')})`;
  }

  getActivationName(layerIndex) {
    if (layerIndex === 0) return null;
    const activation = this.mlp.layers?.[layerIndex - 1]?.activation;
    if (typeof activation !== "string") return null;
    return activation.toUpperCase();
  }

  buildLayers() {
    const inputGeometry = new THREE.BoxGeometry(
      this.options.inputNodeSize,
      this.options.inputNodeSize,
      this.options.inputNodeSize,
    );
    const hiddenGeometry = new THREE.SphereGeometry(this.options.hiddenNodeRadius, 16, 16);
    // Test with MeshBasicMaterial for hidden/output neurons (no lighting influence)
    const hiddenBaseMaterial = new THREE.MeshBasicMaterial();
    hiddenBaseMaterial.toneMapped = false;

    const layerCount = this.mlp.architecture.length;
    const totalWidth = (layerCount - 1) * this.options.layerSpacing;
    const startX = -totalWidth / 2;

    this.clearOutputLabels();
    this.mlp.architecture.forEach((neuronCount, layerIndex) => {
      const layerX = startX + layerIndex * this.options.layerSpacing;
      const positions = this.computeLayerPositions(layerIndex, neuronCount, layerX);
      const isOutputLayer = layerIndex === layerCount - 1;

      if (layerIndex === 0) {
        const material = new THREE.MeshLambertMaterial();
        material.emissive.setRGB(0.08, 0.08, 0.08);
        const mesh = new THREE.InstancedMesh(inputGeometry, material, neuronCount);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        const colorAttribute = new THREE.InstancedBufferAttribute(new Float32Array(neuronCount * 3), 3);
        colorAttribute.setUsage(THREE.DynamicDrawUsage);
        mesh.instanceColor = colorAttribute;

        positions.forEach((position, instanceIndex) => {
          this.tempObject.position.copy(position);
          this.tempObject.updateMatrix();
          mesh.setMatrixAt(instanceIndex, this.tempObject.matrix);
          mesh.setColorAt(instanceIndex, this.tempColor.setRGB(0.15, 0.15, 0.15));
        });

        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
        this.scene.add(mesh);
        this.layerMeshes.push({ mesh, positions, type: "input", layerIndex });
      } else {
        const material = hiddenBaseMaterial.clone();
        // Clone geometry per mesh so each InstancedMesh can have its own instanceColor attribute
        const geometry = hiddenGeometry.clone();
        const mesh = new THREE.InstancedMesh(geometry, material, neuronCount);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        const colorAttribute = new THREE.InstancedBufferAttribute(new Float32Array(neuronCount * 3), 3);
        colorAttribute.setUsage(THREE.DynamicDrawUsage);
        mesh.instanceColor = colorAttribute;

        positions.forEach((position, instanceIndex) => {
          this.tempObject.position.copy(position);
          this.tempObject.updateMatrix();
          mesh.setMatrixAt(instanceIndex, this.tempObject.matrix);
          mesh.setColorAt(instanceIndex, this.tempColor.setRGB(0.15, 0.15, 0.15));
        });

        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
        this.scene.add(mesh);
        const layerType = isOutputLayer ? "output" : "hidden";
        this.layerMeshes.push({ mesh, positions, type: layerType, layerIndex });
        if (isOutputLayer) {
          this.createOutputLabels(positions);
        }
      }
    });
  }

  computeLayerPositions(layerIndex, neuronCount, layerX) {
    const positions = [];
    const isOutputLayer = layerIndex === this.mlp.architecture.length - 1;
    if (layerIndex === 0) {
      const spacing = this.options.inputSpacing;
      let rows;
      let cols;
      if (neuronCount === 28 * 28) {
        rows = 28;
        cols = 28;
      } else {
        cols = Math.ceil(Math.sqrt(neuronCount));
        rows = Math.ceil(neuronCount / cols);
      }
      const height = (rows - 1) * spacing;
      const width = (cols - 1) * spacing;
      let filled = 0;
      for (let row = 0; row < rows && filled < neuronCount; row += 1) {
        for (let col = 0; col < cols && filled < neuronCount; col += 1) {
          const y = height / 2 - row * spacing;
          const z = -width / 2 + col * spacing;
          positions.push(new THREE.Vector3(layerX, y, z));
          filled += 1;
        }
      }
    } else if (isOutputLayer) {
      const spacing = this.options.outputSpacing ?? this.options.hiddenSpacing;
      const height = (neuronCount - 1) * spacing;
      for (let index = 0; index < neuronCount; index += 1) {
        const y = height / 2 - index * spacing;
        positions.push(new THREE.Vector3(layerX, y, 0));
      }
    } else {
      const spacing = this.options.hiddenSpacing;
      const cols = Math.max(1, Math.ceil(Math.sqrt(neuronCount)));
      const rows = Math.ceil(neuronCount / cols);
      const height = (rows - 1) * spacing;
      const width = (cols - 1) * spacing;
      for (let index = 0; index < neuronCount; index += 1) {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const y = height / 2 - row * spacing;
        const z = -width / 2 + col * spacing;
        positions.push(new THREE.Vector3(layerX, y, z));
      }
    }
    return positions;
  }

  clearOutputLabels() {
    if (!this.outputLabels.length || !this.labelGroup) return;
    this.outputLabels.forEach((sprite) => {
      if (sprite.material.map) {
        sprite.material.map.dispose();
      }
      sprite.material.dispose();
      this.labelGroup.remove(sprite);
    });
    this.outputLabels = [];
  }

  createOutputLabels(positions) {
    if (!this.labelGroup) return;
    const offset = this.options.outputLabelOffset ?? 0.65;
    const scale = this.options.outputLabelScale ?? 0.48;
    positions.forEach((position, index) => {
      const label = this.buildDigitSprite(String(index));
      label.position.copy(position);
      label.position.x += offset;
      label.scale.set(scale, scale, scale);
      this.labelGroup.add(label);
      this.outputLabels.push(label);
    });
  }

  buildDigitSprite(text) {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context unavailable for label rendering.");
    }
    ctx.clearRect(0, 0, size, size);
    ctx.font = `900 ${Math.floor(size * 0.62)}px "Inter", "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(235, 245, 255, 0.95)";
    ctx.strokeStyle = "rgba(12, 25, 44, 0.85)";
    ctx.lineWidth = size * 0.08;
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = size * 0.12;
    ctx.strokeText(text, size / 2, size / 2);
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.anisotropy = 2;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.center.set(0, 0.5);
    return sprite;
  }

  buildConnections() {
    this.maxConnectionWeightMagnitude = 0;
    const connectionRadius = this.options.connectionRadius ?? 0.005;
    const baseGeometry = new THREE.CylinderGeometry(connectionRadius, connectionRadius, 1, 10, 1, true);
    const material = new THREE.MeshLambertMaterial();
    // Do not set vertexColors explicitly; instancing color works independently

    this.mlp.layers.forEach((layer, layerIndex) => {
      const { selected, maxAbsWeight } = this.findImportantConnections(layer);
      if (Number.isFinite(maxAbsWeight) && maxAbsWeight > this.maxConnectionWeightMagnitude) {
        this.maxConnectionWeightMagnitude = maxAbsWeight;
      }
      if (!selected.length) return;

      // Clone geometry per mesh so instanceColor can be bound independently
      const mesh = new THREE.InstancedMesh(baseGeometry.clone(), material.clone(), selected.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const colorAttribute = new THREE.InstancedBufferAttribute(new Float32Array(selected.length * 3), 3);
      colorAttribute.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = colorAttribute;

      selected.forEach((connection, instanceIndex) => {
        const sourcePosition = this.layerMeshes[layerIndex].positions[connection.sourceIndex];
        const targetPosition = this.layerMeshes[layerIndex + 1].positions[connection.targetIndex];
        const direction = targetPosition.clone().sub(sourcePosition);
        const length = direction.length();
        const midpoint = sourcePosition.clone().addScaledVector(direction, 0.5);

        this.tempObject.position.copy(midpoint);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.clone().normalize(),
        );
        this.tempObject.scale.set(1, length, 1);
        this.tempObject.quaternion.copy(quaternion);
        this.tempObject.updateMatrix();
        mesh.setMatrixAt(instanceIndex, this.tempObject.matrix);
        mesh.setColorAt(instanceIndex, this.tempColor.setRGB(1, 1, 1));
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      this.scene.add(mesh);
      this.connectionGroups.push({
        mesh,
        connections: selected,
        sourceLayer: layerIndex,
        maxAbsWeight,
      });
    });
  }

  disposeConnectionMeshes() {
    this.connectionGroups.forEach((group) => {
      this.scene.remove(group.mesh);
      if (group.mesh.geometry && typeof group.mesh.geometry.dispose === "function") {
        group.mesh.geometry.dispose();
      }
      const material = group.mesh.material;
      if (Array.isArray(material)) {
        material.forEach((mat) => {
          if (mat && typeof mat.dispose === "function") mat.dispose();
        });
      } else if (material && typeof material.dispose === "function") {
        material.dispose();
      }
    });
    this.connectionGroups = [];
  }

  updateNetworkWeights() {
    this.disposeConnectionMeshes();
    this.buildConnections();
    if (this.selectedNeuron) {
      this.updateConnectionVisibility();
      this.selectionConnectionData = null;
      this.buildSelectionConnectionMeshes();
      if (this.lastDisplayActivations && this.lastNetworkActivations) {
        this.updateSelectionVisuals();
      }
    }
  }

  setMaxConnectionsPerNeuron(limit) {
    const clamped = Math.max(1, Math.floor(limit));
    if (!Number.isFinite(clamped)) return false;
    if (clamped === this.options.maxConnectionsPerNeuron) return false;
    this.options.maxConnectionsPerNeuron = clamped;
    this.updateNetworkWeights();
    return true;
  }

  setConnectionRadius(radius) {
    if (!Number.isFinite(radius)) return false;
    const clamped = Math.max(0.0005, radius);
    if (Math.abs(clamped - this.options.connectionRadius) < 1e-6) return false;
    this.options.connectionRadius = clamped;
    if (this.selectionCylinderGeometry && typeof this.selectionCylinderGeometry.dispose === "function") {
      this.selectionCylinderGeometry.dispose();
    }
    this.selectionCylinderGeometry = null;
    this.updateNetworkWeights();
    return true;
  }

  setConnectionWeightThreshold(threshold) {
    if (!Number.isFinite(threshold)) return false;
    const clamped = Math.max(0, threshold);
    if (Math.abs(clamped - (this.options.connectionWeightThreshold ?? 0)) < 1e-6) return false;
    this.options.connectionWeightThreshold = clamped;
    this.updateNetworkWeights();
    return true;
  }

  getMaxConnectionWeightMagnitude() {
    return this.maxConnectionWeightMagnitude || 0;
  }

  findImportantConnections(layer) {
    const limit = this.options.maxConnectionsPerNeuron;
    const minMagnitude = Math.max(0, this.options.connectionWeightThreshold ?? 0);
    const selected = [];
    let maxAbsWeight = 0;
    for (let target = 0; target < layer.weights.length; target += 1) {
      const row = layer.weights[target];
      const candidates = [];
      for (let source = 0; source < row.length; source += 1) {
        const weight = row[source];
        if (!Number.isFinite(weight)) continue;
        const magnitude = Math.abs(weight);
        candidates.push({ sourceIndex: source, targetIndex: target, weight, magnitude });
        if (magnitude > maxAbsWeight) maxAbsWeight = magnitude;
      }
      candidates.sort((a, b) => b.magnitude - a.magnitude);
      const take = Math.min(limit, candidates.length);
      for (let i = 0; i < take; i += 1) {
        const candidate = candidates[i];
        if (candidate.magnitude < minMagnitude) break;
        selected.push({
          sourceIndex: candidate.sourceIndex,
          targetIndex: candidate.targetIndex,
          weight: candidate.weight,
        });
      }
    }
    return { selected, maxAbsWeight };
  }

  update(displayActivations, networkActivations = displayActivations, preActivations = null) {
    this.lastDisplayActivations = displayActivations;
    this.lastNetworkActivations = networkActivations;
    this.lastPreActivations = preActivations;
    this.layerMeshes.forEach((layer, layerIndex) => {
      const values = displayActivations[layerIndex];
      if (!values) return;
      const scale = layerIndex === 0 ? 1 : maxAbsValue(displayActivations[layerIndex]);
      this.applyNodeColors(layer, values, scale || 1, layerIndex);
    });

    this.connectionGroups.forEach((group) => {
      const sourceValues = networkActivations[group.sourceLayer];
      if (!sourceValues) return;
      this.applyConnectionColors(group, sourceValues);
    });
    if (this.selectedNeuron) {
      this.updateSelectionVisuals();
    } else if (typeof this.focusChangeCallback === "function" && this.currentSelectionDetail !== null) {
      this.currentSelectionDetail = null;
      this.focusChangeCallback(null);
    }
    if (typeof this.requestRender === "function") {
      this.requestRender();
    }
  }

  applyNodeColors(layer, values, scale, layerIndex) {
    const { mesh, type } = layer;
    const activeSelection = this.selectedNeuron;
    if (type === "input") {
      for (let i = 0; i < values.length; i += 1) {
        const value = clamp(values[i], 0, 1);
        const isSelected =
          activeSelection &&
          layerIndex === activeSelection.layerIndex &&
          i === activeSelection.neuronIndex;
        if (isSelected) {
          this.tempColor.copy(this.highlightColor);
        } else {
          this.tempColor.setRGB(value, value, value);
        }
        mesh.setColorAt(i, this.tempColor);
      }
      mesh.instanceColor.needsUpdate = true;
      return;
    }

    const safeScale = scale > 1e-6 ? scale : 1;
    for (let i = 0; i < values.length; i += 1) {
      const value = values[i];
      const normalized = clamp(value / safeScale, 0, 1);
      const isSelected =
        activeSelection &&
        layerIndex === activeSelection.layerIndex &&
        i === activeSelection.neuronIndex;
      if (isSelected) {
        this.tempColor.copy(this.highlightColor);
      } else {
        this.tempColor.setRGB(normalized, normalized, normalized);
      }
      mesh.setColorAt(i, this.tempColor);
    }
    mesh.instanceColor.needsUpdate = true;
  }

  applyConnectionColors(group, sourceValues) {
    const contributions = new Float32Array(group.connections.length);
    let maxContribution = 0;
    group.connections.forEach((connection, index) => {
      const activation = sourceValues[connection.sourceIndex] ?? 0;
      const contribution = activation * connection.weight;
      contributions[index] = contribution;
      const magnitude = Math.abs(contribution);
      if (magnitude > maxContribution) maxContribution = magnitude;
    });
    const scale = maxContribution > 1e-6 ? maxContribution : group.maxAbsWeight || 1;
    group.connections.forEach((connection, index) => {
      const normalized = clamp(contributions[index] / scale, -1, 1);
      const magnitude = Math.abs(normalized);
      if (magnitude < 1e-3) {
        this.tempColor.setRGB(0, 0, 0);
      } else if (normalized >= 0) {
        this.tempColor.setRGB(0, magnitude, 0);
      } else {
        this.tempColor.setRGB(magnitude, 0, 0);
      }
      group.mesh.setColorAt(index, this.tempColor);
    });
    group.mesh.instanceColor.needsUpdate = true;
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (typeof this.requestRender === "function") {
      this.requestRender();
    }
  }

  animate() {
    this.renderRequested = false;
    this.needsContinuousRender = false;

    const renderFrame = (time) => {
      this.renderRequested = false;
      const controlsChanged = this.controls.update();
      this.renderer.render(this.scene, this.camera);
      if (this.fpsMonitor) {
        this.fpsMonitor.update(time);
      }
      if (this.needsContinuousRender || controlsChanged) {
        this.requestRender();
      }
    };

    this.requestRender = () => {
      if (this.renderRequested) return;
      this.renderRequested = true;
      requestAnimationFrame(renderFrame);
    };

    this.controls.addEventListener("start", () => {
      this.needsContinuousRender = true;
      this.requestRender();
    });
    this.controls.addEventListener("end", () => {
      this.needsContinuousRender = false;
      this.requestRender();
    });
    this.controls.addEventListener("change", () => {
      this.requestRender();
    });

    this.requestRender();
  }
}

export { NeuralVisualizer };
