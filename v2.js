import { createCanvas, loadImage } from "canvas";
import fs from "fs";

import { Vector3d } from "./vectors.js";

import { Particle } from "./particle.js";

import { BlackHole, Ray, Camera } from "./bh.js";

import { normalize, eulerDirectionUpdate } from "./utils.js";

const WIDTH = 1000;
const HEIGHT = 500;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

const G = 6.6743e-11; // Gravitational constant m^3 kg^-1 s^-2
const c = 299792458; // Speed of Light m/s

const SOLAR_MASS = 1.989e30;

const bh = new BlackHole(new Vector3d(0, 0, 0), SOLAR_MASS * 1);

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

const fov = 20;
const fovInRadians = (fov * Math.PI) / 180;

const camera = new Camera(new Vector3d(0, 500000, 10000), bh.position, new Vector3d(0, 0, 1), fovInRadians, WIDTH / HEIGHT);

const timeStep = 0.000001;

const diskCanvas = createCanvas(1000, 1000);
const diskCtx = diskCanvas.getContext("2d");
// Animation loop with visual enhancements
function frame() {
  // Draw a semi-transparent rectangle to create trailing effect
  diskCtx.fillStyle = "rgba(0, 0, 0, 1)";
  diskCtx.fillRect(0, 0, diskCanvas.width, diskCanvas.height);

  // Update and render each particle
  particles.forEach((particle, index) => {
    particle.update(timeStep);

    diskCtx.fillStyle = "white";
    // Map simulation coordinates to canvas coordinates
    const x = normalize(particle.position.u, -bh.rs * 10, bh.rs * 10, 0, diskCanvas.width);
    const y = normalize(particle.position.v, -bh.rs * 10, bh.rs * 10, diskCanvas.height, 0); // Flip Y axis for canvas

    // Optionally, highlight one particle for reference
    if (index === 0) {
      diskCtx.fillStyle = "red";
    }

    // Draw particle as a circle
    diskCtx.beginPath();
    diskCtx.arc(x, y, 1.5, 0, Math.PI * 2);
    diskCtx.fill();
  });

  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      let stepSize = 1000;
      const ray = camera.generateRay(x, y, WIDTH, HEIGHT);

      ray.direction = eulerDirectionUpdate(ray, bh, stepSize);

      let color = { r: 255, g: 255, b: 255 };

      let stepCount = 0;

      while (true) {
        const distance = Vector3d.distance(ray.origin, bh.position);
        ray.direction = eulerDirectionUpdate(ray, bh, stepSize);

        if (distance < bh.rs) {
          color = { r: 0, g: 0, b: 0 };
          break;
        }

        const prevW = ray.origin.w;
        ray.step(stepSize);
        const currentW = ray.origin.w;

        if (prevW * currentW < 0 && distance < 75000 && distance > 10000) {
          // Detect crossing zero
          color = { r: 0, g: 0, b: 0 };

          break;
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

  // Save the canvas as an image file
  const diskOut = fs.createWriteStream("disk.png");
  const diskStream = diskCanvas.createPNGStream();
  diskStream.pipe(diskOut);
  diskOut.on("finish", () => {
    console.log("The image was created as disk.png");
  });

  // Save the canvas as an image file
  const out = fs.createWriteStream("output.png");
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on("finish", () => {
    console.log("The image was created as output.png");
  });
}

frame();
