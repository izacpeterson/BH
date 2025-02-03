import { BlackHole } from "./bh.js";
import { Vector3d } from "./vectors.js";

import { Particle } from "./particle.js";

// Constants
const G = 6.6743e-11;
const MASS_OF_SUN = 1.989e30; // Mass of the Sun in kilograms

// Create the Black Hole instance
const bhPosition = new Vector3d(0, 0, 0);
const bh = new BlackHole(bhPosition, MASS_OF_SUN);

// Setup Canvas
const canvas = document.createElement("canvas");
canvas.width = 1000;
canvas.height = 1000;
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

// Utility: Normalize a value from one range to another
function normalize(value, minInput, maxInput, minOutput, maxOutput) {
  return ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
}

// Create Particles
const particles = [];
const numParticles = 10000;

for (let i = 0; i < numParticles; i++) {
  // Generate random coordinates around the black hole
  const randomX = Math.random() * bh.rs * 20 - bh.rs * 10;
  const randomY = Math.random() * bh.rs * 20 - bh.rs * 10;
  const randomZ = 0; // Working in 2D for visualization

  const particlePosition = new Vector3d(randomX, randomY, randomZ);
  const particle = new Particle(particlePosition, bh);

  // Only include particles within a certain distance range from the black hole
  const distanceFromBH = Vector3d.distance(bh.position, particle.position);
  if (distanceFromBH > bh.rs * 1 && distanceFromBH < bh.rs * 10) {
    particles.push(particle);
  }
}

// Simulation parameters
const timeStep = 0.000001;

// Animation loop with visual enhancements
function animate() {
  // Draw a semi-transparent rectangle to create trailing effect
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw black hole glow (centered)
  const bhScreenX = normalize(bh.position.u, -bh.rs * 10, bh.rs * 10, 0, canvas.width);
  const bhScreenY = normalize(bh.position.v, -bh.rs * 10, bh.rs * 10, canvas.height, 0);
  const gradient = ctx.createRadialGradient(bhScreenX, bhScreenY, 0, bhScreenX, bhScreenY, 50);
  gradient.addColorStop(0, "rgba(255, 100, 0, 1)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  // ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(bhScreenX, bhScreenY, 50, 0, Math.PI * 2);
  ctx.fill();

  // Update and render each particle
  particles.forEach((particle, index) => {
    particle.update(timeStep);

    // Map velocity magnitude to brightness
    const brightness = normalize(particle.velocityVector.magnitude(), 50000000, 150000000, 50, 255);
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;

    // Map simulation coordinates to canvas coordinates
    const x = normalize(particle.position.u, -bh.rs * 10, bh.rs * 10, 0, canvas.width);
    const y = normalize(particle.position.v, -bh.rs * 10, bh.rs * 10, canvas.height, 0); // Flip Y axis for canvas

    // Optionally, highlight one particle for reference
    if (index === 0) {
      ctx.fillStyle = "red";
    }

    // Draw particle as a circle
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(animate);
}

// Start the animation loop
animate();
