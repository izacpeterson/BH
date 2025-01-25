import { createCanvas } from "canvas";
import fs from "fs";

import { Vector3d } from "./vectors.js";

// Set up canvas dimensions
const canvasWidth = 1024;
const canvasHeight = 1024;
const canvas = createCanvas(canvasWidth, canvasHeight);
const ctx = canvas.getContext("2d");

const G = 6.6743e-11; // Gravitational constant m^3 kg^-1 s^-2
const c = 299792458; // Speed of Light m/s

class BlackHole {
  constructor(position, mass) {
    this.position = position; // Vector3d
    this.mass = mass;

    this.rs = this.schwarzschildRadius(mass);
    // Removed scaleFactor
  }

  schwarzschildRadius(mass) {
    return (2 * G * mass) / c ** 2;
  }
}

class Ray {
  constructor(origin, direction) {
    this.origin = origin; // Vector3d
    this.direction = direction; // Vector3d
    this.direction.normalize();
  }

  getPoint(t) {
    return Vector3d.add(this.origin, Vector3d.scale(this.direction, t));
  }

  warp(warpFunction) {
    this.direction = warpFunction(this);
    this.direction.normalize();
  }

  step(stepSize) {
    this.origin = Vector3d.add(this.origin, Vector3d.scale(this.direction, stepSize));
  }
}

class Camera {
  constructor(position, lookAt, up, fov, aspectRatio) {
    this.position = position; // Vector3d
    this.lookAt = lookAt; // Vector3d

    this.up = up; // Vector3d
    this.fov = fov;
    this.aspectRatio = aspectRatio;

    this.forward = Vector3d.subtract(lookAt, position);
    this.forward.normalize();

    this.right = Vector3d.cross(this.forward, up);
    this.right.normalize();

    this.trueUp = Vector3d.cross(this.right, this.forward);
    this.viewportHeight = 2 * Math.tan(fov / 2);
    this.viewportWidth = this.viewportHeight * aspectRatio;
  }

  generateRay(x, y, canvasWidth, canvasHeight) {
    const u = (x + 0.5) / canvasWidth - 0.5;
    const v = 0.5 - (y + 0.5) / canvasHeight;

    const horizontal = Vector3d.scale(this.right, u * this.viewportWidth);
    const vertical = Vector3d.scale(this.trueUp, v * this.viewportHeight);

    const rayDirection = Vector3d.add(this.forward, Vector3d.add(horizontal, vertical));

    rayDirection.normalize();

    return new Ray(this.position, rayDirection);
  }
}

function hash(x, y, z) {
  return Math.abs((Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453) % 1);
}

function background(ray) {
  const x = ray.direction.u;
  const y = ray.direction.v;
  const z = ray.direction.w;

  // Rotate the ray direction by 90 degrees around the Z-axis
  const rotatedX = -y; // Swapping X and Y with a sign change to rotate 90 degrees
  const rotatedY = x;
  const rotatedZ = z; // Z remains unchanged for a rotation around the Z-axis

  // Map rotated direction to UV coordinates
  const u = 0.5 + Math.atan2(rotatedZ, rotatedX) / (2 * Math.PI); // Longitude
  const v = 0.5 - Math.asin(rotatedY) / Math.PI; // Latitude

  // Scale UV to grid coordinates
  const gridSize = 250; // Number of grid cells
  const gridX = Math.floor(u * gridSize);
  const gridY = Math.floor(v * gridSize);

  // Alternate color based on grid cell
  const isBlack = (gridX + gridY) % 2 === 0;

  if (isBlack) {
    return { r: 0, g: 0, b: 0 }; // Black grid cell
  } else {
    return { r: 255, g: 255, b: 255 }; // White grid cell
  }
}

function calculateImpactParameter(ray, blackHole) {
  const r0 = Vector3d.subtract(ray.origin, blackHole.position); // Vector from ray origin to black hole
  const cross = Vector3d.cross(r0, ray.direction); // Cross product of r0 and ray direction
  return Vector3d.magnitude(cross) / Vector3d.magnitude(ray.direction); // Normalize by direction magnitude
}

function calculateDeflectionAngle(b, blackHole) {
  // Removed scaling factor
  return (4 * G * blackHole.mass) / (c ** 2 * b);
}

function lensingWarp(ray, blackHole, b) {
  const deflectionAngle = calculateDeflectionAngle(b, blackHole);

  // Vector pointing toward the black hole
  const toBlackHole = Vector3d.subtract(blackHole.position, ray.origin);
  const normalizedToBlackHole = Vector3d.normalize(toBlackHole);

  // Gradually adjust the ray's direction toward the black hole
  const scaledDeflection = Vector3d.scale(normalizedToBlackHole, deflectionAngle * 0.001); // Apply a small fraction
  return Vector3d.add(ray.direction, scaledDeflection);
}

// Example usage
const mass = 1.989e30; // Mass of the Sun in kilograms

// Adjusted black hole position without scaling
let bh = new BlackHole(new Vector3d(0, -100000, 0), mass); // Changed from (0, -1000, 0) to (0, -100000, 0)

console.log(`The Schwarzschild radius is ${bh.rs} meters.`);

// Camera setup
let origin = new Vector3d(0, 0, 0);
let direction = new Vector3d(0, -100000, 0); // Look towards the black hole

const fov = 90;
const fovInRadians = (fov * Math.PI) / 180;

// Adjusted camera 'up' vector for better visualization
let cam = new Camera(
  origin,
  direction,
  new Vector3d(0, 0, 1), // Changed from (0, 0, 90) to (0, 0, 1) to use unit vector
  fovInRadians,
  canvasWidth / canvasHeight
);

let absorbedCount = 0;
let totalCount = 0;

console.log(`Schwarzschild Radius: ${bh.rs} meters`);

const cameraDistanceToBH = Vector3d.distance(cam.position, bh.position);
console.log(`Camera Distance to Black Hole: ${cameraDistanceToBH} meters`);

// Adjusted step size and iterations based on new distances
let stepSize = 100; // Increased step size to cover larger distances
let iterations = Math.ceil(cameraDistanceToBH / stepSize) * 2; // Ensure sufficient iterations

// Ray tracing loop with adjusted step size and iterations
for (let y = 0; y < canvasHeight; y++) {
  for (let x = 0; x < canvasWidth; x++) {
    const ray = cam.generateRay(x, y, canvasWidth, canvasHeight);

    const b = calculateImpactParameter(ray, bh);

    totalCount++;
    let isAbsorbed = false;
    let testPixel = false;

    // Calculate dynamic max iterations
    for (let i = 0; i < iterations; i++) {
      const distance = distanceToBlackHole(ray, bh);

      if (x === 200 && y === Math.floor(canvasWidth / 2)) {
        // Debugging specific pixel
        console.log(distance, bh.rs);
        testPixel = true;
      }

      // Check for absorption
      if (distance < bh.rs) {
        isAbsorbed = true;
        absorbedCount++;
        break;
      }

      ray.warp((ray) => lensingWarp(ray, bh, b));

      // Step the ray forward
      ray.step(stepSize);
    }

    // Render the pixel
    if (isAbsorbed) {
      ctx.fillStyle = "black"; // Black for absorbed rays
    } else if (testPixel) {
      ctx.fillStyle = "red";
    } else {
      const color = background(ray);
      ctx.fillStyle = `rgb(${Math.floor(color.r)}, ${Math.floor(color.g)}, ${Math.floor(color.b)})`;
    }

    ctx.fillRect(x, y, 1, 1);
  }
}

console.log(`Absorbed Rays: ${absorbedCount}, Total Rays: ${totalCount}`);

// Function to calculate distance to black hole
function distanceToBlackHole(ray, bh) {
  return Vector3d.distance(ray.origin, bh.position);
}

// Save the canvas as an image file
const out = fs.createWriteStream("output.png");
const stream = canvas.createPNGStream();
stream.pipe(out);
out.on("finish", () => {
  console.log("The image was created as output.png");
});
