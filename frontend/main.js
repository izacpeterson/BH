// import { createCanvas, loadImage } from "canvas";

import { Vector3d } from "../vectors.js";

import { Particle } from "../particle.js";

import { BlackHole, Ray, Camera } from "../bh.js";

import { normalize, eulerDirectionUpdate, hsvToRgb } from "../utils.js";

const WIDTH = 1920 * 2;
const HEIGHT = 1080 * 2;

const G = 6.6743e-11; // Gravitational constant m^3 kg^-1 s^-2
const c = 299792458; // Speed of Light m/s

const SOLAR_MASS = 1.989e30;

const bh = new BlackHole(new Vector3d(0, 0, 0), SOLAR_MASS * 1);

// Create Particles
const particles = [];
const numParticles = 50000;

let diskInner = bh.rs * 1;
let diskOuter = bh.rs * 20;

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

const camera = new Camera(
  new Vector3d(0, 500000, 10000),
  new Vector3d(0, 0, 0),
  new Vector3d(0.5, 0, 1),
  fovInRadians,
  WIDTH / HEIGHT
);

const timeStep = 0.000001;

const diskCanvas = document.getElementById("disk");
diskCanvas.width = WIDTH * 2;
diskCanvas.height = HEIGHT * 2;
const diskCtx = diskCanvas.getContext("2d");

for (let i = 0; i < 50; i++) {
  // Draw a semi-transparent rectangle to create trailing effect
  diskCtx.fillStyle = "rgba(0, 0, 0, 0.05)";
  diskCtx.fillRect(0, 0, diskCanvas.width, diskCanvas.height);

  // Update and render each particle
  particles.forEach((particle, index) => {
    particle.update(timeStep);

    let dist = Vector3d.distance(bh.position, particle.position);

    let normalizedDistance = normalize(dist, diskOuter, diskInner, 1, 0.9);

    let normalizedMagnitude = normalize(
      particle.velocityMagnitude,
      50000000,
      200000000,
      0,
      1
    );

    normalizedMagnitude += particle.variance * 0.5;

    let col = hsvToRgb(0.4, 1 - normalizedMagnitude, 0 + normalizedMagnitude);

    // console.log(normalizedMagnitude);

    // console.log(col);

    // diskCtx.fillStyle = "white";
    diskCtx.fillStyle = `rgb(${col.r}, ${col.b}, ${col.g})`;
    // Map simulation coordinates to canvas coordinates
    const x = normalize(
      particle.position.u,
      0 - particleBounds / 2,
      particleBounds / 2,
      0,
      diskCanvas.width
    );
    const y = normalize(
      particle.position.v,
      0 - particleBounds / 2,
      particleBounds / 2,
      diskCanvas.height,
      0
    ); // Flip Y axis for canvas

    // Optionally, highlight one particle for reference
    if (index === 0) {
      // diskCtx.fillStyle = "red";
    }

    // Draw particle as a circle
    diskCtx.beginPath();
    diskCtx.arc(x, y, 1, 0, Math.PI * 2);
    diskCtx.fill();
  });
}
console.log("Disk Rendered");
const canvas = document.getElementById("canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext("2d");
console.log("Beginning Black Hole");
let x = 0;

function renderColumn() {
  for (let y = 0; y < HEIGHT; y++) {
    const ray = camera.generateRay(x, y, WIDTH, HEIGHT);
    let color = { r: 0, g: 0, b: 0 };

    let stepSize = 10000;
    let stepCount = 0;
    let photonOrbitCount = 0;
    let diskIntersects = 0;
    const photonSphereRadius = 1.5 * bh.rs;

    while (true) {
      const distance = Vector3d.distance(ray.origin, bh.position);
      if (distance < particleBounds) {
        ray.direction = eulerDirectionUpdate(ray, bh, stepSize);
      }

      stepSize = Math.max(10, 1 * (distance / bh.rs) ** 2);
      if (distance > 10 * bh.rs && stepSize > 1000000) break;
      if (
        distance < photonSphereRadius * 1.1 &&
        distance > photonSphereRadius * 0.9
      ) {
        stepSize = 170;
        photonOrbitCount++;
      }

      if (distance < bh.rs) {
        color = { r: 0, g: 0, b: 0 };
        break;
      }

      const prevW = ray.origin.w;
      ray.step(stepSize);
      const currentW = ray.origin.w;

      if (prevW * currentW < 0) {
        const diskX = Math.floor(
          normalize(
            ray.origin.u,
            -particleBounds,
            particleBounds,
            0,
            diskCanvas.width
          )
        );
        const diskY = Math.floor(
          normalize(
            ray.origin.v,
            -particleBounds,
            particleBounds,
            0,
            diskCanvas.height
          )
        );

        const pixel = diskCtx.getImageData(diskX, diskY, 1, 1).data;
        color.r += pixel[0];
        color.g += pixel[1];
        color.b += pixel[2];

        const toCamera = Vector3d.subtract(camera.position, ray.origin);
        toCamera.normalize();

        let part = new Particle(ray.origin, bh);
        let radialVelocity = Vector3d.dot(part.velocityVector, ray.direction);

        let scaleFactor = 7;
        let dopplerFactor = Math.pow(
          Math.sqrt((1 + radialVelocity / c) / (1 - radialVelocity / c)),
          scaleFactor
        );

        color.r = Math.min(255, color.r * dopplerFactor);
        color.g = Math.min(255, color.g * dopplerFactor);
        color.b = Math.min(255, color.b * dopplerFactor);

        diskIntersects++;
        if (diskIntersects === 2 || color.r !== 0) break;
      }

      stepCount++;
      if (stepCount > 10000) break;
    }

    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.fillRect(x, y, 1, 1);
  }

  document.getElementById("msg").innerText = `Rendering column ${
    x + 1
  } / ${WIDTH}`;

  x++;
  if (x < WIDTH) {
    requestAnimationFrame(renderColumn);
  } else {
    console.log("Rendering complete");
  }
}

renderColumn();
