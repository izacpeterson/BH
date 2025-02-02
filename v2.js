import { createCanvas, loadImage } from "canvas";
import fs from "fs";

import { Vector3d } from "./vectors.js";

import { Particle } from "./particle.js";

import { BlackHole, Ray, Camera } from "./bh.js";

import { normalize, eulerDirectionUpdate, hsvToRgb } from "./utils.js";

const WIDTH = 1920 / 4;
const HEIGHT = 1080 / 4;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

const G = 6.6743e-11; // Gravitational constant m^3 kg^-1 s^-2
const c = 299792458; // Speed of Light m/s

const SOLAR_MASS = 1.989e30;

const bh = new BlackHole(new Vector3d(0, 0, 0), SOLAR_MASS * 1);

// Create Particles
const particles = [];
const numParticles = 10000;

let diskInner = bh.rs * 1;
let diskOuter = bh.rs * 10;

let particleBounds = diskOuter * 2;

for (let i = 0; i < numParticles; i++) {
  // Generate random coordinates around the black hole
  const randomX = Math.random() * particleBounds - particleBounds / 2;
  const randomY = Math.random() * particleBounds - particleBounds / 2;
  const randomZ = 0; // Working in 2D for visualization

  const particlePosition = new Vector3d(randomX, randomY, randomZ);
  const particle = new Particle(particlePosition, bh);

  // Only include particles within a certain distance range from the black hole
  const distanceFromBH = Vector3d.distance(bh.position, particle.position);
  if (distanceFromBH > diskInner && distanceFromBH < diskOuter) {
    particles.push(particle);
  }
}

const fov = 10;
const fovInRadians = (fov * Math.PI) / 180;

const camera = new Camera(new Vector3d(0, 500000, 50000), bh.position, new Vector3d(0, 0, 1), fovInRadians, WIDTH / HEIGHT);

const timeStep = 0.000001;

const diskCanvas = createCanvas(1000, 1000);
const diskCtx = diskCanvas.getContext("2d");
// Animation loop with visual enhancements\

function frame() {
  // Draw a semi-transparent rectangle to create trailing effect
  diskCtx.fillStyle = "rgba(0, 0, 0, 0.01)";
  diskCtx.fillRect(0, 0, diskCanvas.width, diskCanvas.height);

  // Update and render each particle
  particles.forEach((particle, index) => {
    particle.update(timeStep);

    let dist = Vector3d.distance(bh.position, particle.position);

    let normalizedDistance = normalize(dist, diskOuter, diskInner, 0, 1);

    let normalizedMagnitude = normalize(particle.velocityMagnitude, 50000000, 200000000, 0, 1);

    let col = hsvToRgb(0.4, 1 - normalizedMagnitude, normalizedDistance);

    // console.log(normalizedMagnitude);

    // console.log(col);

    // diskCtx.fillStyle = "white";
    diskCtx.fillStyle = `rgb(${col.r}, ${col.b}, ${col.g})`;
    // Map simulation coordinates to canvas coordinates
    const x = normalize(particle.position.u, 0 - particleBounds / 2, particleBounds / 2, 0, diskCanvas.width);
    const y = normalize(particle.position.v, 0 - particleBounds / 2, particleBounds / 2, diskCanvas.height, 0); // Flip Y axis for canvas

    // Optionally, highlight one particle for reference
    if (index === 0) {
      diskCtx.fillStyle = "red";
    }

    // Draw particle as a circle
    diskCtx.beginPath();
    diskCtx.arc(x, y, 5, 0, Math.PI * 2);
    diskCtx.fill();
  });

  console.log(bh.rs * 5);

  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      let stepSize = 10000;
      const ray = camera.generateRay(x, y, WIDTH, HEIGHT);

      ray.direction = eulerDirectionUpdate(ray, bh, stepSize);

      let color = { r: 0, g: 0, b: 0 };

      let stepCount = 0;

      const photonSphereRadius = 1.5 * bh.rs;
      let photonOrbitCount = 0; // Track how long a ray spends near the photon sphere
      const photonOrbitThreshold = 10; // Define a threshold for a ray to be considered part of the photon ring

      while (true) {
        const distance = Vector3d.distance(ray.origin, bh.position);
        ray.direction = eulerDirectionUpdate(ray, bh, stepSize);

        if (distance < particleBounds * 2) {
          stepSize = 1000;
        } else if (distance < bh.rs * 2) {
          stepSize = 100;
        }

        // // If the ray enters the photon sphere, track how long it stays there
        // if (distance < photonSphereRadius * 1.1 && distance > photonSphereRadius * 0.9) {
        //   // console.log("photon sphere");
        //   stepSize = 130;
        //   // console.log(photonOrbitCount);
        //   photonOrbitCount++;
        // }

        // // If a ray spends a long time near the photon sphere before escaping, mark it as photon ring
        // if (photonOrbitCount > photonOrbitThreshold) {
        //   // console.log("photon break");
        //   color = { r: 255, g: 255, b: 255 };

        //   break; // Exit the loop and color this ray in the photon ring color
        // }

        if (distance < bh.rs) {
          color = { r: 0, g: 0, b: 0 };
          break;
        }

        const prevW = ray.origin.w;
        ray.step(stepSize);
        const currentW = ray.origin.w;

        if (prevW * currentW < 0) {
          // Detect crossing zero
          // color = { r: 255, g: 255, b: 255 };

          const diskX = Math.floor(normalize(ray.origin.u, 0 - particleBounds, particleBounds, 0, diskCanvas.width));
          const diskY = Math.floor(normalize(ray.origin.v, 0 - particleBounds, particleBounds, 0, diskCanvas.height));

          // console.log(diskX, diskY);

          const pixel = diskCtx.getImageData(diskX, diskY, 1, 1).data;
          // console.log(pixel);
          color = { r: pixel[0], g: pixel[1], b: pixel[2] };
          break;

          if (color.r !== 0) {
            // let normalizedDistance = normalize(distance, particleBounds, diskInner, 0, 255);
            // color = { r: normalizedDistance, g: normalizedDistance, b: normalizedDistance };
            break;
          } else {
            // break;
          }
        }

        stepCount++;
        if (stepCount > 1000) {
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
  for (let i = 0; i < 1; i++) {
    // Adjust frame count as needed
    frame();
    await saveCanvas(diskCanvas, "./disk", i);
    await saveCanvas(canvas, "./output", i);
  }
}

runFrames().catch((err) => {
  console.error("Error saving images:", err);
});
