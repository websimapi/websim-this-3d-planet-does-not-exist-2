import React from 'react';
import ReactDOM from 'react-dom';
import { showPlanet } from './main.js';
import { generatePlanetDescription, generatePlanetTexture } from './planetGenerator.js';
import { savePlanet, getPlanetById } from './database.js';
import { createPlanetView } from './sceneManager.js';

// Initialize UI
function initializeUI(state) {
  // Create React container for UI
  const uiContainer = document.createElement('div');
  uiContainer.className = 'ui-container';
  document.getElementById('app').appendChild(uiContainer);
  
  // Render React app
  ReactDOM.render(<App state={state} />, uiContainer);
  
  // Set up global callback for planet updates
  state.onPlanetsUpdate = (planets) => {
    // This will be called whenever the planet collection changes
    if (state.updateGallery) {
      state.updateGallery(planets);
    }
  };
}

// Main React component
function App({ state }) {
  const [showGallery, setShowGallery] = React.useState(false);
  const [showDetail, setShowDetail] = React.useState(false);
  const [selectedPlanet, setSelectedPlanet] = React.useState(null);
  const [planets, setPlanets] = React.useState([]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  
  // Set up planet update callback
  React.useEffect(() => {
    state.updateGallery = setPlanets;
    
    // Initial load of planets
    const initialPlanets = state.room.collection('planet').getList();
    setPlanets(initialPlanets);
    
    return () => {
      state.updateGallery = null;
    };
  }, []);
  
  // Setup planet subscription using React 18's useSyncExternalStore
  const currentPlanets = React.useSyncExternalStore(
    state.room.collection('planet').subscribe,
    () => state.room.collection('planet').getList()
  );
  
  React.useEffect(() => {
    setPlanets(currentPlanets);
  }, [currentPlanets]);
  
  // Handle planet selection in gallery
  const handleSelectPlanet = (planet) => {
    setSelectedPlanet(planet);
    setShowDetail(true);
    showPlanet(planet);
  };
  
  // Close detail view and return to gallery
  const handleCloseDetail = () => {
    setShowDetail(false);
    // Return to gallery view
    const randomPlanet = planets[Math.floor(Math.random() * planets.length)];
    if (randomPlanet) {
      showPlanet(randomPlanet);
    }
  };
  
  return (
    <>
      <Header />
      
      <button 
        className="gallery-button" 
        onClick={() => setShowGallery(!showGallery)}
      >
        {showGallery ? "Close Gallery" : "View Gallery"}
      </button>
      
      <PlanetForm 
        state={state} 
        isGenerating={isGenerating}
        setIsGenerating={setIsGenerating}
        onPlanetCreated={(planet) => {
          setSelectedPlanet(planet);
          setShowDetail(true);
          showPlanet(planet);
        }}
      />
      
      {showGallery && (
        <Gallery 
          planets={planets} 
          onSelectPlanet={handleSelectPlanet}
          onClose={() => setShowGallery(false)}
        />
      )}
      
      {showDetail && selectedPlanet && (
        <PlanetDetail 
          planet={selectedPlanet}
          state={state}
          onClose={handleCloseDetail}
        />
      )}
    </>
  );
}

// Header component
function Header() {
  return (
    <div className="header">
      <h1 className="title">This 3D Planet Does Not Exist</h1>
    </div>
  );
}

// Planet generation form
function PlanetForm({ state, isGenerating, setIsGenerating, onPlanetCreated }) {
  const [prompt, setPrompt] = React.useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (prompt.trim() === "" || isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      // Step 1: Generate planet description from prompt
      const description = await generatePlanetDescription(prompt);
      
      // Extract name from the description (usually the first sentence has the name)
      const nameMatch = description.match(/^(.*?)(?:\.|,|\n)/);
      let name = "Unknown Planet";
      
      if (nameMatch && nameMatch[1]) {
        // Try to extract just the name from the first sentence
        const potentialName = nameMatch[1].trim();
        const nameOnly = potentialName.match(/^(?:The planet |Planet |The world |World )?([A-Z][a-zA-Z0-9\-\' ]+)$/);
        
        if (nameOnly && nameOnly[1]) {
          name = nameOnly[1].trim();
        } else {
          // If we can't extract a clean name, use the first sentence
          name = potentialName.substring(0, 30);
        }
      }
      
      // Step 2: Generate texture image from description
      const textureUrl = await generatePlanetTexture(description);
      
      // Step 3: Save to database
      const planetData = {
        name,
        description,
        textureUrl,
        seed: Math.floor(Math.random() * 1000000)
      };
      
      const savedPlanet = await savePlanet(state, planetData);
      
      // Step 4: Show the new planet
      onPlanetCreated(savedPlanet);
      
      // Clear form
      setPrompt("");
    } catch (error) {
      console.error("Error generating planet:", error);
      alert("Failed to generate planet. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <form className="planet-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="prompt">Describe a planet to generate:</label>
        <textarea
          id="prompt"
          placeholder="e.g., A gaseous giant with swirling storms and multiple rings"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
      </div>
      <button 
        type="submit" 
        className="form-button"
        disabled={isGenerating || prompt.trim() === ""}
      >
        {isGenerating ? "Generating Planet..." : "Generate Planet"}
      </button>
    </form>
  );
}

// Gallery component
function Gallery({ planets, onSelectPlanet, onClose }) {
  // Sort planets by timestamp (newest first)
  const sortedPlanets = [...planets].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h2 className="gallery-title">Planet Gallery</h2>
        <button className="gallery-close" onClick={onClose}>Close Gallery</button>
      </div>
      
      <div className="gallery-grid">
        {sortedPlanets.length === 0 ? (
          <div className="no-planets">
            No planets have been generated yet. Be the first to create one!
          </div>
        ) : (
          sortedPlanets.map(planet => (
            <PlanetCard 
              key={planet.id} 
              planet={planet} 
              onClick={() => onSelectPlanet(planet)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Planet card component for gallery
function PlanetCard({ planet, onClick }) {
  const canvasRef = React.useRef(null);
  
  React.useEffect(() => {
    if (!canvasRef.current) return;
    
    // Create a mini planet preview
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    
    // Create a background gradient
    gradient.addColorStop(0, '#14213d');
    gradient.addColorStop(1, '#000000');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // If we have a texture, try to load it
    if (planet.textureUrl) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        // Draw the image as a circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 3, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(
          img, 
          canvas.width / 2 - canvas.width / 3, 
          canvas.height / 2 - canvas.width / 3,
          canvas.width / 1.5,
          canvas.width / 1.5
        );
        
        ctx.restore();
        
        // Add a soft glow around the planet
        const glowGradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, canvas.width / 3 - 5,
          canvas.width / 2, canvas.height / 2, canvas.width / 3 + 20
        );
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 3 + 20, 0, Math.PI * 2);
        ctx.fill();
      };
      
      img.onerror = () => {
        // On error, draw a placeholder circle
        drawPlaceholderPlanet(ctx, canvas, planet.seed);
      };
      
      // Try with direct URL first
      img.src = planet.textureUrl;
      
      // If that fails, try with CORS proxy
      setTimeout(() => {
        if (!img.complete || img.naturalWidth === 0) {
          img.src = "https://cors-anywhere.herokuapp.com/" + planet.textureUrl;
        }
      }, 3000);
      
    } else {
      // Draw a placeholder
      drawPlaceholderPlanet(ctx, canvas, planet.seed);
    }
  }, [planet, canvasRef.current]);
  
  // Get shortened description
  const shortDescription = planet.description
    ? planet.description.substring(0, 100) + (planet.description.length > 100 ? '...' : '')
    : 'No description available';
  
  return (
    <div className="planet-card" onClick={onClick}>
      <div className="planet-card-preview">
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={200}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div className="planet-card-info">
        <h3 className="planet-card-title">{planet.name}</h3>
        <div className="planet-card-creator">By: {planet.username}</div>
        <p className="planet-card-description">{shortDescription}</p>
      </div>
    </div>
  );
}

// Function to draw a placeholder planet
function drawPlaceholderPlanet(ctx, canvas, seed) {
  // Use seed for consistent colors
  const random = seed ? new MersenneTwister(seed) : Math;
  
  // Draw a colored circle
  const hue = Math.floor(random.random() * 360);
  const saturation = 70 + Math.floor(random.random() * 30);
  const lightness = 40 + Math.floor(random.random() * 20);
  
  ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Add some surface details
  const detailsCount = Math.floor(random.random() * 12) + 5;
  
  for (let i = 0; i < detailsCount; i++) {
    // Random position within the circle
    const angle = random.random() * Math.PI * 2;
    const distance = random.random() * (canvas.width / 3 - 10);
    const x = canvas.width / 2 + Math.cos(angle) * distance;
    const y = canvas.height / 2 + Math.sin(angle) * distance;
    
    // Random size and color
    const size = random.random() * 15 + 5;
    const detailLightness = lightness + (random.random() > 0.5 ? 15 : -15);
    
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${detailLightness}%)`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add a glow
  const glowGradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width / 3 - 5,
    canvas.width / 2, canvas.height / 2, canvas.width / 3 + 20
  );
  glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
  glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
  glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 3 + 20, 0, Math.PI * 2);
  ctx.fill();
}

// Planet detail view
function PlanetDetail({ planet, state, onClose }) {
  const detailCanvasRef = React.useRef(null);
  
  React.useEffect(() => {
    if (!detailCanvasRef.current) return;
    
    const canvas = detailCanvasRef.current;
    const scene = state.scene.clone();
    const camera = state.camera.clone();
    const renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      alpha: true 
    });
    
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    
    // Create controls for this view
    const controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    
    // Create the planet for this view
    createPlanetView({ scene, camera, controls }, planet);
    
    // Animation loop
    let animationId;
    function animate() {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
    };
  }, [planet, detailCanvasRef.current]);
  
  return (
    <div className="planet-detail">
      <div className="detail-header">
        <h2>{planet.name}</h2>
        <button className="detail-close" onClick={onClose}>Close Detail</button>
      </div>
      
      <div className="detail-content">
        <div className="detail-view">
          <canvas 
            ref={detailCanvasRef} 
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        
        <div className="detail-info">
          <h3 className="detail-title">{planet.name}</h3>
          <div className="detail-creator">Discovered by: {planet.username}</div>
          <p className="detail-description">{planet.description}</p>
        </div>
      </div>
    </div>
  );
}

// Mersenne Twister for consistent random generation
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
export { initializeUI };

