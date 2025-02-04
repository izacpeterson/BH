import { createCanvas } from "canvas";
import fs from "fs";

import { Vector3d } from "./vectors.js";
import { Particle } from "./particle.js";
import { BlackHole, Camera } from "./bh.js";
import { normalize, hsvToRgb } from "./utils.js";

// Use a lower resolution (feel free to tweak)
const WIDTH = 1920 / 5;
const HEIGHT = 1080 / 5;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

// Constants (you probably already have these)
const G = 6.6743e-11; // Gravitational constant
const c = 299792458; // Speed of Light
const SOLAR_MASS = 1.989e30;

// Create a black hole
const bh = new BlackHole(new Vector3d(0, 0, 0), SOLAR_MASS);

// Create particles for the accretion disk
const particles = [];
const numParticles = 10000;
const diskInner = bh.rs; // inner radius of the disk
const diskOuter = bh.rs * 10; // outer radius of the disk
const particleBounds = diskOuter * 2;

for (let i = 0; i < numParticles; i++) {
  // Random 2D position (with z = 0) within bounds
  const randomX = Math.random() * particleBounds - particleBounds / 2;
  const randomY = Math.random() * particleBounds - particleBounds / 2;
  const randomZ = 0;

  const particlePosition = new Vector3d(randomX, randomY, randomZ);
  const distanceFromBH = Vector3d.distance(bh.position, particlePosition);

  // Only include particles within the disk region
  if (distanceFromBH > diskInner && distanceFromBH < diskOuter) {
    const particle = new Particle(particlePosition, bh);
    particles.push(particle);
  }
}

// Set up the camera
const fov = 7; // in degrees
const fovInRadians = (fov * Math.PI) / 180;
const camera = new Camera(
  new Vector3d(0, 500000, 100000),
  new Vector3d(0, 0, 5000),
  new Vector3d(0, 0, 1),
  fovInRadians,
  WIDTH / HEIGHT
);

// For performance and better visuals, we no longer iterate over every pixel.
// Instead, each frame we update the particles and then project/draw them.
// (You might want to adjust the particle update time step.)
const timeStep = 0.000001;

/**
 * A new frame function:
 *   - Draws a semi-transparent overlay for trailing.
 *   - Updates each particle.
 *   - Projects and draws each particle as a small circle.
 *   - (Optionally) draws the black hole at its projected position.
 */
function frame() {
  // Draw a semi-transparent rectangle to fade previous frames
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Update particles (simulate movement, etc.)
  particles.forEach((particle) => particle.update(timeStep));

  // Render each particle by projecting it into 2D
  particles.forEach((particle) => {
    const screenPos = camera.project(particle.position);
    if (screenPos) {
      // Color based on particle velocity (tweak as needed)
      let normalizedMagnitude = normalize(
        particle.velocityMagnitude,
        50000000,
        200000000,
        0,
        1
      );
      const col = hsvToRgb(0, 1 - normalizedMagnitude, normalizedMagnitude);

      // Draw a small circle (or "splat")
      ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, 0.8)`;
      ctx.beginPath();
      // Adjust the radius for a “soft” look
      ctx.arc(screenPos.x, screenPos.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // (Optional) Draw the black hole (a simple dark circle)
  const bhScreenPos = camera.project(bh.position);
  if (bhScreenPos) {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(bhScreenPos.x, bhScreenPos.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Save the current canvas as a PNG.
 */
async function saveCanvas(canvas, filePath, frameIndex) {
  return new Promise((resolve, reject) => {
    const paddedIndex = frameIndex.toString().padStart(4, "0");
    const out = fs.createWriteStream(`${filePath}/${paddedIndex}.png`);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on("finish", () => {
      console.log(`Saved ${filePath}/${paddedIndex}.png`);
      resolve();
    });
    out.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Run and save multiple frames.
 */
async function runFrames() {
  const totalFrames = 30 * 30; // adjust as needed
  for (let i = 0; i < totalFrames; i++) {
    frame();
    await saveCanvas(canvas, "./output", i);
  }
}

runFrames().catch((err) => {
  console.error("Error saving images:", err);
});
