import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Setup the Three.js scene
function setupScene() {
  // Create renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.getElementById('app').appendChild(renderer.domElement);

  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000510);
  
  // Create camera
  const camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.set(0, 0, 5);
  
  // Add orbit controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 10;
  
  // Add stars background
  createStars(scene);
  
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);
  
  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 3, 5);
  scene.add(directionalLight);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
  
  return { scene, renderer, camera, controls };
}

// Create stars background
function createStars(scene) {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true
  });
  
  const starsVertices = [];
  for (let i = 0; i < 3000; i++) {
    const x = THREE.MathUtils.randFloatSpread(100);
    const y = THREE.MathUtils.randFloatSpread(100);
    const z = THREE.MathUtils.randFloatSpread(100);
    starsVertices.push(x, y, z);
  }
  
  starsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starsVertices, 3)
  );
  
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

// Create a planet in the scene
function createPlanetView(state, planetData) {
  // Clear existing planet
  clearPlanet(state.scene);
  
  // Create the base geometry
  const geometry = new THREE.SphereGeometry(2, 64, 64);
  
  // Create material
  let material;
  
  if (planetData.textureUrl) {
    // Try to load texture from URL
    loadTextureWithFallback(planetData.textureUrl)
      .then(texture => {
        material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.8,
          metalness: 0.1
        });
        createAndAddPlanet(state, geometry, material, planetData);
      })
      .catch(err => {
        console.error("Texture loading error, using procedural texture:", err);
        material = createProceduralMaterial(planetData.seed || Math.random() * 1000000);
        createAndAddPlanet(state, geometry, material, planetData);
      });
  } else {
    // Create procedural material if no texture URL
    material = createProceduralMaterial(planetData.seed || Math.random() * 1000000);
    createAndAddPlanet(state, geometry, material, planetData);
  }
}

// Load texture with CORS fallback
async function loadTextureWithFallback(url) {
  const textureLoader = new THREE.TextureLoader();
  
  try {
    // Try loading directly first
    return await new Promise((resolve, reject) => {
      textureLoader.load(
        url,
        texture => resolve(texture),
        undefined,
        error => reject(error)
      );
    });
  } catch (error) {
    console.warn("Direct texture loading failed, trying CORS proxy:", error);
    
    // Try with CORS proxy
    const corsProxy = "https://cors-anywhere.herokuapp.com/";
    return await new Promise((resolve, reject) => {
      textureLoader.load(
        corsProxy + url,
        texture => resolve(texture),
        undefined,
        error => reject(error)
      );
    });
  }
}

// Create procedural material for planet
function createProceduralMaterial(seed) {
  // Use the seed to create deterministic randomness
  const random = new MersenneTwister(seed);
  
  // Choose color scheme
  const colorSchemes = [
    { base: 0x3498db, highlight: 0x2980b9, lowlight: 0x1f618d }, // Blue
    { base: 0xe74c3c, highlight: 0xc0392b, lowlight: 0x922b21 }, // Red
    { base: 0x2ecc71, highlight: 0x27ae60, lowlight: 0x196f3d }, // Green
    { base: 0x9b59b6, highlight: 0x8e44ad, lowlight: 0x6c3483 }, // Purple
    { base: 0xf1c40f, highlight: 0xf39c12, lowlight: 0xb7950b }, // Yellow
    { base: 0xe67e22, highlight: 0xd35400, lowlight: 0xa04000 }, // Orange
    { base: 0x16a085, highlight: 0x138d75, lowlight: 0x0e6655 }, // Teal
    { base: 0x95a5a6, highlight: 0x7f8c8d, lowlight: 0x616a6b }  // Gray
  ];
  
  const scheme = colorSchemes[Math.floor(random.random() * colorSchemes.length)];
  
  // Create canvas for texture
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Fill background with base color
  ctx.fillStyle = '#' + scheme.base.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add noise patterns
  const noise = createNoisePattern(canvas.width, canvas.height, random);
  
  // Apply noise
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < noise.length; i++) {
    const idx = i * 4;
    const baseColor = hexToRgb(scheme.base);
    const highlightColor = hexToRgb(scheme.highlight);
    const lowlightColor = hexToRgb(scheme.lowlight);
    
    // Use noise to mix colors
    const noiseValue = noise[i];
    let r, g, b;
    
    if (noiseValue > 0.6) {
      // Highlight areas
      const factor = (noiseValue - 0.6) / 0.4;
      r = Math.floor(baseColor.r + (highlightColor.r - baseColor.r) * factor);
      g = Math.floor(baseColor.g + (highlightColor.g - baseColor.g) * factor);
      b = Math.floor(baseColor.b + (highlightColor.b - baseColor.b) * factor);
    } else if (noiseValue < 0.4) {
      // Lowlight areas
      const factor = (0.4 - noiseValue) / 0.4;
      r = Math.floor(baseColor.r + (lowlightColor.r - baseColor.r) * factor);
      g = Math.floor(baseColor.g + (lowlightColor.g - baseColor.g) * factor);
      b = Math.floor(baseColor.b + (lowlightColor.b - baseColor.b) * factor);
    } else {
      // Base color areas
      r = baseColor.r;
      g = baseColor.g;
      b = baseColor.b;
    }
    
    data[idx] = r;     // R
    data[idx + 1] = g; // G
    data[idx + 2] = b; // B
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Add details like craters or clouds
  addPlanetDetails(ctx, canvas.width, canvas.height, random, scheme);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.1
  });
}

// Create and add planet to scene
function createAndAddPlanet(state, geometry, material, planetData) {
  const planet = new THREE.Mesh(geometry, material);
  planet.name = 'planet';
  
  // Create atmosphere if needed
  if (Math.random() > 0.3) {
    const atmosphere = createAtmosphere();
    planet.add(atmosphere);
  }
  
  // Apply random rotation
  planet.rotation.y = Math.random() * Math.PI * 2;
  
  // Add to scene
  state.scene.add(planet);
  
  // Add rotation animation
  let lastTime = 0;
  function animatePlanet(time) {
    if (planet && planet.parent) {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      
      // Slow rotation
      planet.rotation.y += delta * 0.1;
      
      requestAnimationFrame(animatePlanet);
    }
  }
  
  requestAnimationFrame(animatePlanet);
}

// Helper functions for procedural generation
function createNoisePattern(width, height, random) {
  const noise = [];
  const frequency = 8;
  const amplitude = 1;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width - 0.5;
      const ny = y / height - 0.5;
      const distance = Math.sqrt(nx * nx + ny * ny) * 2;
      
      // Generate simplex-like noise
      let value = 0;
      for (let i = 0; i < 4; i++) {
        const freq = frequency * Math.pow(2, i);
        value += simplex2(nx * freq, ny * freq, random) * (amplitude / Math.pow(2, i));
      }
      
      // Apply spherical mask
      value = value * (1 - distance * distance);
      
      noise.push(value * 0.5 + 0.5);
    }
  }
  
  return noise;
}

function simplex2(x, y, random) {
  // A very simple pseudo-simplex noise
  const corners = [
    random.random() * 2 - 1,
    random.random() * 2 - 1,
    random.random() * 2 - 1,
    random.random() * 2 - 1
  ];
  
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const cx = x - fx;
  const cy = y - fy;
  
  const v1 = corners[0] * (1 - cx) * (1 - cy);
  const v2 = corners[1] * cx * (1 - cy);
  const v3 = corners[2] * (1 - cx) * cy;
  const v4 = corners[3] * cx * cy;
  
  return v1 + v2 + v3 + v4;
}

function hexToRgb(hex) {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255
  };
}

function addPlanetDetails(ctx, width, height, random, scheme) {
  const detailType = Math.floor(random.random() * 4); // 0-3 different detail types
  
  switch (detailType) {
    case 0: // Craters
      const numCraters = Math.floor(random.random() * 30) + 5;
      for (let i = 0; i < numCraters; i++) {
        const x = random.random() * width;
        const y = random.random() * height;
        const size = random.random() * 30 + 5;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x + size * 0.2, y - size * 0.2, size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
        ctx.fill();
      }
      break;
      
    case 1: // Cloud patterns
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffffff';
      
      for (let i = 0; i < 20; i++) {
        const x = random.random() * width;
        const y = random.random() * height;
        const size = random.random() * 100 + 50;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      break;
      
    case 2: // Stripe patterns
      const numStripes = Math.floor(random.random() * 5) + 3;
      const stripeBrightness = random.random() > 0.5 ? 1.2 : 0.8;
      
      for (let i = 0; i < numStripes; i++) {
        const y = (height / numStripes) * i;
        const stripeHeight = height / (numStripes * 2);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * stripeBrightness})`;
        ctx.fillRect(0, y, width, stripeHeight);
      }
      break;
      
    case 3: // Continent-like patterns
      const numContinents = Math.floor(random.random() * 3) + 2;
      const continentColor = hexToRgb(scheme.highlight);
      
      for (let i = 0; i < numContinents; i++) {
        const centerX = random.random() * width;
        const centerY = random.random() * height;
        const points = [];
        
        // Create random polygon
        const numPoints = Math.floor(random.random() * 8) + 5;
        const radius = random.random() * 100 + 50;
        
        for (let j = 0; j < numPoints; j++) {
          const angle = (j / numPoints) * Math.PI * 2;
          const distance = radius * (0.7 + random.random() * 0.6);
          const x = centerX + Math.cos(angle) * distance;
          const y = centerY + Math.sin(angle) * distance;
          points.push({x, y});
        }
        
        // Draw continent
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let j = 1; j < points.length; j++) {
          ctx.lineTo(points[j].x, points[j].y);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(${continentColor.r}, ${continentColor.g}, ${continentColor.b}, 0.5)`;
        ctx.fill();
      }
      break;
  }
}

function createAtmosphere() {
  const geometry = new THREE.SphereGeometry(2.1, 32, 32);
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(0x88ccff),
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide
  });
  
  return new THREE.Mesh(geometry, material);
}

// Clear existing planet from scene
function clearPlanet(scene) {
  const existingPlanet = scene.getObjectByName('planet');
  if (existingPlanet) {
    scene.remove(existingPlanet);
  }
}

// Mersenne Twister pseudo-random number generator for consistent procedural generation
function MersenneTwister(seed) {
  seed = seed || Math.floor(Math.random() * 1000000);
  
  let mt = new Array(624);
  let index = 0;
  
  // Initialize the generator from a seed
  mt[0] = seed >>> 0;
  for (let i = 1; i < 624; i++) {
    mt[i] = (1812433253 * (mt[i-1] ^ (mt[i-1] >>> 30)) + i) >>> 0;
  }
  
  // Extract a tempered pseudorandom number
  this.random = function() {
    if (index === 0) {
      generateNumbers();
    }
    
    let y = mt[index];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    
    index = (index + 1) % 624;
    return y / 0x100000000; // Convert to [0,1)
  };
  
  // Generate an array of 624 untempered numbers
  function generateNumbers() {
    for (let i = 0; i < 624; i++) {
      let y = (mt[i] & 0x80000000) + (mt[(i+1) % 624] & 0x7fffffff);
      mt[i] = mt[(i + 397) % 624] ^ (y >>> 1);
      if (y % 2 !== 0) {
        mt[i] ^= 0x9908b0df;
      }
    }
  }
}

// Export functions
export { setupScene, createPlanetView };

