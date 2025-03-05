import { setupScene, createPlanetView } from './sceneManager.js';
import { initializeUI } from './uiManager.js';
import { initDatabase } from './database.js';
import { generatePlanetDescription, generatePlanetTexture } from './planetGenerator.js';

// Initialize global state
const state = {
  loading: true,
  currentPlanet: null,
  scene: null,
  renderer: null,
  camera: null,
  controls: null,
  room: null,
};

// Main initialization
async function initialize() {
  try {
    // Connect to multiplayer room
    state.room = new WebsimSocket();
    
    // Wait for connection
    await new Promise(resolve => {
      state.room.onmessage = (event) => {
        if (event.data.type === 'connected') {
          resolve();
        }
      };
    });
    
    // Initialize the database
    await initDatabase(state);
    
    // Set up the Three.js scene
    const sceneConfig = setupScene();
    Object.assign(state, sceneConfig);
    
    // Initialize the UI
    initializeUI(state);
    
    // Hide loading screen
    document.getElementById('loading').style.display = 'none';
    state.loading = false;
    
    // Initialize the first planet (random selection from database or default)
    const planets = state.room.collection('planet').getList();
    if (planets.length > 0) {
      const randomIndex = Math.floor(Math.random() * planets.length);
      showPlanet(planets[randomIndex]);
    } else {
      // Create a default planet if none exist
      const defaultPlanet = {
        name: "Default Planet",
        description: "A mysterious planet waiting to be discovered. Generate your own planet to replace this one!",
        textureUrl: null, // Will use default texture
        seed: Math.floor(Math.random() * 1000000)
      };
      showPlanet(defaultPlanet);
    }
  } catch (error) {
    console.error("Initialization error:", error);
    document.getElementById('loading').innerHTML = `
      <div>Error: Could not initialize the application.</div>
      <div>${error.message}</div>
    `;
  }
}

// Function to show a planet in the scene
function showPlanet(planetData) {
  state.currentPlanet = planetData;
  createPlanetView(state, planetData);
}

// Start the application
initialize();

// Export functions for other modules
export { state, showPlanet };

