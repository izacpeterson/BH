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
const numParticles = 10000;

let diskInner = bh.rs * 4;
let diskOuter = bh.rs * 20;

let particleBounds = diskOuter * 2;

const gridResolution = 100; // Number of cubes along each axis
const gridSize = diskOuter * 2; // Size of the grid
const voxelSize = gridSize / gridResolution; // Size of each voxel

// Initialize a 3D grid (a nested object)
let voxelGrid = {};

function getVoxelKey(x, y, z) {
  const vx = Math.floor((x + gridSize / 2) / voxelSize);
  const vy = Math.floor((y + gridSize / 2) / voxelSize);
  const vz = Math.floor((z + gridSize / 2) / voxelSize);
  return `${vx},${vy},${vz}`;
}

for (let i = 0; i < numParticles; i++) {
  // Generate random coordinates around the black hole
  const randomX = Math.random() * particleBounds - particleBounds / 2;
  const randomY = Math.random() * particleBounds - particleBounds / 2;
  const randomZ = Math.random() * 5000 - 2500; // Working in 2D for visualization

  const particlePosition = new Vector3d(randomX, randomY, randomZ);
  const particle = new Particle(particlePosition, bh);

  // Only include particles within a certain distance range from the black hole
  const distanceFromBH = Vector3d.distance(bh.position, particle.position);
  if (distanceFromBH > diskInner && distanceFromBH < diskOuter) {
    particles.push(particle);
  }
}

voxelGrid = {};

// Populate the voxel grid
particles.forEach((particle) => {
  const key = getVoxelKey(
    particle.position.u,
    particle.position.v,
    particle.position.w
  );
  if (!voxelGrid[key]) {
    voxelGrid[key] = 0;
  }
  voxelGrid[key]++;
});

console.log(voxelGrid);

const fov = 10;
const fovInRadians = (fov * Math.PI) / 180;

const camera = new Camera(
  new Vector3d(500000, 500000, 100000),
  new Vector3d(0, 0, 0),
  new Vector3d(0, 0, 1),
  fovInRadians,
  WIDTH / HEIGHT
);

const timeStep = 0.000001;

const diskCanvas = createCanvas(2000, 2000);
const diskCtx = diskCanvas.getContext("2d");
// Animation loop with visual enhancements\

function frame() {
  voxelGrid = {};

  // Populate the voxel grid
  particles.forEach((particle) => {
    const key = getVoxelKey(
      particle.position.u,
      particle.position.v,
      particle.position.w
    );
    if (!voxelGrid[key]) {
      voxelGrid[key] = 0;
    }
    voxelGrid[key]++;

    particle.update(timeStep);
  });

  console.log(bh.rs * 5);

  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      let stepSize = 10000;
      const ray = camera.generateRay(x, y, WIDTH, HEIGHT);

      // ray.direction = eulerDirectionUpdate(ray, bh, stepSize);

      let color = { r: 0, g: 0, b: 0 };

      let stepCount = 0;

      const photonSphereRadius = 1.5 * bh.rs;
      let photonOrbitCount = 0; // Track how long a ray spends near the photon sphere
      const photonOrbitThreshold = 10; // Define a threshold for a ray to be considered part of the photon ring

      let diskIntersects = 0;

      while (true) {
        const distance = Vector3d.distance(ray.origin, bh.position);

        if (distance < particleBounds) {
          ray.direction = eulerDirectionUpdate(ray, bh, stepSize);
        }

        stepSize = Math.max(10, 1 * (distance / bh.rs) ** 2);
        if (distance > 10 * bh.rs && stepSize > 1000000) break; // Escape condition

        if (distance < bh.rs) {
          // color = { r: 0, g: 0, b: 0 };
          break;
        }

        const prevW = ray.origin.w;
        ray.step(stepSize);
        const currentW = ray.origin.w;

        let key = getVoxelKey(ray.origin.u, ray.origin.v, ray.origin.w);
        // console.log(key);
        let density = voxelGrid[key];
        if (density) {
          // console.log(density);
          color.r++;
          color.g++;
          color.b++;

          if (color.r > 255) {
            break;
          }
        }
        stepCount++;
        if (stepCount > 10000) {
          break;
        }
      }

      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
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
  for (let i = 0; i < 60; i++) {
    // Adjust frame count as needed
    frame();
    await saveCanvas(diskCanvas, "./disk", i);
    await saveCanvas(canvas, "./output", i);
  }
}

runFrames().catch((err) => {
  console.error("Error saving images:", err);
});
