// Initialize database for planets
async function initDatabase(state) {
  // Set up subscriptions for planet collection
  state.room.collection('planet').subscribe(planets => {
    // This will be called whenever the collection changes
    console.log("Planet collection updated:", planets);
    
    // We'll handle updates in the UI manager
    if (state.onPlanetsUpdate) {
      state.onPlanetsUpdate(planets);
    }
  });
  
  console.log("Database initialized");
  return true;
}

// Save a new planet to the database
async function savePlanet(state, planetData) {
  try {
    // Create the planet record
    const planet = await state.room.collection('planet').create({
      name: planetData.name,
      description: planetData.description,
      textureUrl: planetData.textureUrl,
      seed: planetData.seed || Math.floor(Math.random() * 1000000),
      timestamp: new Date().toISOString()
    });
    
    console.log("Planet saved:", planet);
    return planet;
  } catch (error) {
    console.error("Error saving planet:", error);
    throw error;
  }
}

// Get planet by ID
async function getPlanetById(state, id) {
  const planets = state.room.collection('planet').getList();
  return planets.find(p => p.id === id);
}

// Export database functions
export { initDatabase, savePlanet, getPlanetById };

