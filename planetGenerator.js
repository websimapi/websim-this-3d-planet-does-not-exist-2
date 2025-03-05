// Generate planet description using LLM
async function generatePlanetDescription(prompt) {
  try {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert astronomer and science fiction writer. Create a detailed, imaginative, and scientifically plausible description of a planet based on the user's prompt.
Your description should include:
1. Basic planetary characteristics (size, composition, atmosphere)
2. The planet's star system and position
3. Unique geographic features
4. Climate and weather patterns
5. Any notable phenomena or events
6. A creative name for the planet

Your descriptions should be vivid and sensory-rich, between 150-250 words. Use colorful, evocative language while maintaining scientific plausibility.
Respond ONLY with the description text, no additional commentary.`
        },
        {
          role: "user",
          content: prompt || "Create a unique and fascinating alien planet."
        }
      ]
    });
    
    return completion.content.trim();
  } catch (error) {
    console.error("Error generating planet description:", error);
    return "Failed to generate planet description. Please try again.";
  }
}

// Generate planet texture using LLM to describe, then image generation
async function generatePlanetTexture(description) {
  try {
    // First, use LLM to create a detailed image prompt based on the description
    const imagePromptCompletion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert in creating detailed image generation prompts for alien planets.
Based on the provided planet description, create a specific, detailed prompt that will generate a high-quality, 
seamless spherical texture map for this planet when fed to an image generation AI.

Your prompt should:
1. Focus on the surface features, colors, and atmosphere of the planet
2. Be specific about textures, patterns, and lighting
3. Include key words like "seamless texture", "planet surface", "aerial view", "spherical map"
4. Describe the planet from a distance, as if viewed from space
5. Be between 50-100 words long, focused and specific

DO NOT include any UI elements, text overlays, or borders in your description.
Ensure the prompt will create an image that works well as a planet texture (will wrap around a sphere).
Respond ONLY with the image generation prompt, no additional commentary.`
        },
        {
          role: "user",
          content: description
        }
      ]
    });
    
    const imagePrompt = imagePromptCompletion.content.trim();
    
    // Now use the refined prompt to generate the actual image
    const result = await websim.imageGen({
      prompt: imagePrompt,
      aspect_ratio: "1:1", // Square aspect ratio for planet texture
    });
    
    return result.url;
  } catch (error) {
    console.error("Error generating planet texture:", error);
    return null; // Return null to fallback to procedural texture
  }
}

export { generatePlanetDescription, generatePlanetTexture };

