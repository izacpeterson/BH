import { createCanvas, loadImage } from "canvas";
import fs from "fs";

import { Vector3d } from "./vectors.js";
import { Particle } from "./particle.js";
import { BlackHole, Ray, Camera } from "./bh.js";
import { normalize, eulerDirectionUpdate, hsvToRgb } from "./utils.js";

const WIDTH = 1920 * 0.25;
const HEIGHT = 1080 * 0.25;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

const G = 6.6743e-11; // Gravitational constant m^3 kg^-1 s^-2
const c = 299792458; // Speed of Light m/s
const SOLAR_MASS = 1.989e30;

const bh = new BlackHole(new Vector3d(0, 0, 0), SOLAR_MASS * 1);

// Create Particles
const particles = [];
const numParticles = 1000000;

let diskInner = bh.rs * 3;
let diskOuter = bh.rs * 40;

let particleBounds = diskOuter * 2;

// Voxel Grid Settings
const GRID_RESOLUTION = 250; // Number of voxels per axis
const GRID_SIZE = diskOuter * 2; // Physical size of the grid
const VOXEL_SIZE = GRID_SIZE / GRID_RESOLUTION; // Size of each voxel

const GRID_VOLUME = GRID_RESOLUTION ** 3; // Total number of voxels
let voxelGrid = new Array(GRID_VOLUME).fill(null); // 1D voxel array

// Precompute constants
const HALF_GRID_SIZE = GRID_SIZE / 2;
const INV_VOXEL_SIZE = 1 / VOXEL_SIZE;

function gaussianFalloff(value, center, width) {
  return Math.exp(-((value - center) ** 2) / (2 * width ** 2));
}

/**
 * Convert 3D coordinates to a 1D index for fast voxel lookup.
 */
function getVoxelIndex(x, y, z) {
  const vx = Math.floor((x + HALF_GRID_SIZE) * INV_VOXEL_SIZE);
  const vy = Math.floor((y + HALF_GRID_SIZE) * INV_VOXEL_SIZE);
  const vz = Math.floor((z + HALF_GRID_SIZE) * INV_VOXEL_SIZE);

  // Ensure we're inside the voxel grid
  if (
    vx < 0 ||
    vx >= GRID_RESOLUTION ||
    vy < 0 ||
    vy >= GRID_RESOLUTION ||
    vz < 0 ||
    vz >= GRID_RESOLUTION
  ) {
    return -1; // Out of bounds
  }

  return vx + vy * GRID_RESOLUTION + vz * GRID_RESOLUTION ** 2;
}

// Generate particles
function randomGaussian(mean, stddev) {
  let u = 1 - Math.random(); // Avoid log(0)
  let v = 1 - Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stddev;
}

for (let i = 0; i < numParticles; i++) {
  // Adjust X, Y, and Z distributions with a Gaussian curve
  const randomX = randomGaussian(0, particleBounds / 4); // Closer clustering
  const randomY = randomGaussian(0, particleBounds / 4);
  const randomZ = randomGaussian(0, 500); // More compact Z spread

  const particlePosition = new Vector3d(randomX, randomY, randomZ);
  const particle = new Particle(particlePosition, bh);

  // Compute distance from black hole
  const distanceFromBH = Vector3d.distance(bh.position, particle.position);

  let normalizedDistance = gaussianFalloff(
    distanceFromBH,
    diskInner,
    (diskOuter - diskInner) / 4 // Slightly sharper transition
  );
  particle.temp = normalizedDistance;

  // Increase density near the black hole by allowing closer particles
  if (distanceFromBH > diskInner * 0.5 && distanceFromBH < diskOuter) {
    particles.push(particle);
  }
}

// Populate voxel grid
particles.forEach((particle) => {
  const index = getVoxelIndex(
    particle.position.u,
    particle.position.v,
    particle.position.w
  );
  if (index === -1) return; // Skip if out of bounds

  if (!voxelGrid[index]) {
    voxelGrid[index] = { count: 0, velocity: new Vector3d(0, 0, 0), temp: 0 };
  }
  voxelGrid[index].count++;
  voxelGrid[index].velocity = Vector3d.add(
    voxelGrid[index].velocity,
    particle.velocityVector
  );
  voxelGrid[index].temp += particle.temp;
});

const fov = 10;
const fovInRadians = (fov * Math.PI) / 180;

const camera = new Camera(
  new Vector3d(500000, 300000, 100000),
  new Vector3d(0, 0, 0),
  new Vector3d(0, 0, 1),
  fovInRadians,
  WIDTH / HEIGHT
);

let stepSize = 1000;

const timeStep = 0.00001;

/**
 * Render frame by stepping rays through the voxel grid.
 */
function frame() {
  voxelGrid = [];

  particles.forEach((particle) => {
    const index = getVoxelIndex(
      particle.position.u,
      particle.position.v,
      particle.position.w
    );
    if (index === -1) return; // Skip if out of bounds

    if (!voxelGrid[index]) {
      voxelGrid[index] = { count: 0, velocity: new Vector3d(0, 0, 0), temp: 0 };
    }
    voxelGrid[index].count++;
    voxelGrid[index].velocity = Vector3d.add(
      voxelGrid[index].velocity,
      particle.velocityVector
    );
    voxelGrid[index].temp += particle.temp;

    particle.update(timeStep);
  });

  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      const ray = camera.generateRay(x, y, WIDTH, HEIGHT);

      let stepCount = 0;
      let emmission = 0;
      let absorbtion = 0;
      let prevIndex = -1;

      while (true) {
        ray.step(stepSize);

        let distance = Vector3d.distance(bh.position, ray.origin);
        if (distance < bh.rs) {
          //   emmission = 0;
          //   break;
        }

        if (distance < particleBounds) {
          ray.direction = eulerDirectionUpdate(ray, bh, stepSize);
        }

        let index = getVoxelIndex(ray.origin.u, ray.origin.v, ray.origin.w);
        if (index !== prevIndex) {
          let voxel = voxelGrid[index];
          if (voxel) {
            let avgVelocity = Vector3d.scale(voxel.velocity, 1 / voxel.count);
            let vLOS = Vector3d.dot(avgVelocity, ray.direction);

            let beta = vLOS / c;
            beta = Math.max(-0.99, Math.min(beta, 0.99));

            let dopplerFactor = Math.sqrt((1 + beta) / (1 - beta));
            dopplerFactor = Math.pow(dopplerFactor, 5); // Strengthen Doppler effect

            // Increase absorption scaling (reduces transparency)
            let densityFactor = voxel.count * 0.001; // More particles → more absorption

            if (voxel.temp > 1) {
              let adjustedEmission = voxel.temp * 0.005 * dopplerFactor; // Reduce raw emission
              emmission += adjustedEmission;
            }

            // Increase absorption effect
            absorbtion += voxel.temp * 0.05 + densityFactor; // Stronger density-based absorption
          }
        }

        prevIndex = index;
        stepCount++;
        if (stepCount > 1000) break;
      }

      // Compute Transmittance (light passing through)
      let transmittance = Math.exp(-absorbtion * 1.5); // Lower the effect of absorption

      // Background light (black for now)
      let backgroundIntensity = 0;

      // Compute final intensity
      let intensity = backgroundIntensity * transmittance + emmission;

      // Adjust brightness normalization
      let normalizedIntensity = Math.tanh(intensity * 0.5); // Smoothly cap high values
      let color = Math.min(255, normalizedIntensity * 255);

      // Set pixel color
      ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

async function saveCanvas(canvas, filePath, frameIndex) {
  return new Promise((resolve, reject) => {
    const paddedIndex = frameIndex.toString().padStart(4, "0"); // Ensures 4-digit padding (0001, 0002, ...)
    const out = fs.createWriteStream(`${filePath}/${paddedIndex}.png`);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on("finish", () => {
      console.log(`The image was created as ${filePath}/${paddedIndex}.png`);
      resolve();
    });
    out.on("error", (err) => {
      reject(err);
    });
  });
}

async function runFrames() {
  for (let i = 0; i < 150; i++) {
    // Adjust frame count as needed
    frame();
    await saveCanvas(canvas, "./output", i);
  }
}

runFrames().catch((err) => {
  console.error("Error saving images:", err);
});
