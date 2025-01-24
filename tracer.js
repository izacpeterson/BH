import { createCanvas } from "canvas";
import fs from "fs";

import { Vector3d } from "./vectors.js";
// Set up canvas dimensions
const canvasWidth = 512;
const canvasHeight = 512;
const canvas = createCanvas(canvasWidth, canvasHeight);
const ctx = canvas.getContext("2d");

class BlackHole {
  constructor(position, mass) {
    this.position = position;
    this.mass = mass;

    this.scaleFactor = 1e-2;

    this.rs = this.schwarzschildRadius(mass);
    this.rs = this.rs * this.scaleFactor;
  }

  schwarzschildRadius(mass) {
    return (2 * G * mass) / c ** 2;
  }
}

const G = 6.6743e-11; //Gravitational constant m^3 kg^-1 s^-2
const c = 299792458; //Speed of Light m/s

// Example usage
const mass = 1.989e30; // Mass of the Sun in kilograms

let bh = new BlackHole(new Vector3d(0, -50, 0), mass);

console.log(`The Schwarzschild radius is ${bh.rs} meters.`);

console.log(`The scaled Schwarzschild radius is ${bh.rs} units `);

class Ray {
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = direction;
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
    this.position = position; //Vector3d
    this.lookAt = lookAt; //Vector3d

    this.up = up; //Vector3d
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

function distanceToBlackHole(ray, bh) {
  return Vector3d.distance(ray.origin, bh.position);
}

let origin = new Vector3d(0, 0, 0);
let direction = new Vector3d(0, -100, 0);

// let ray = new Ray(origin, direction);

// console.log(ray.getPoint(4));

let cam = new Camera(origin, direction, new Vector3d(0, 0, 90), 90, canvasWidth / canvasHeight);

console.log(cam.right);

function hash(x, y, z) {
  return Math.abs((Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453) % 1);
}

function background(ray) {
  const x = ray.direction.u;
  const y = ray.direction.v;
  const z = ray.direction.w;

  // Generate a hash-based seed for this ray direction
  const seed = hash(x, y, z);

  // Random chance for a star
  const starChance = Math.random();
  if (starChance > 0) {
    // Random brightness and color
    const brightness = Math.random() * 255;
    const colors = [
      { r: brightness, g: brightness, b: brightness }, // White
      { r: brightness, g: brightness * 0.9, b: brightness * 0.7 }, // Yellowish
      { r: brightness * 0.7, g: brightness * 0.8, b: brightness }, // Bluish
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return {
      r: color.r,
      g: color.g,
      b: color.b,
    };
  }

  // Empty space (black background)
  return { r: 0, g: 0, b: 0 };
}

let absorbedCount = 0;
let totalCount = 0;

console.log(`Scaled Schwarzschild Radius: ${bh.rs}`);

for (let y = 0; y < canvasHeight; y++) {
  for (let x = 0; x < canvasWidth; x++) {
    const ray = cam.generateRay(x, y, canvasWidth, canvasHeight);

    if (x % 100 === 0 && y % 100 === 0) {
      console.log(`Ray Direction: ${ray.direction.print()}, Origin: ${ray.origin.print()}`);
    }

    totalCount++;
    let isAbsorbed = false;

    for (let i = 0; i < 200; i++) {
      const b = distanceToBlackHole(ray, bh);

      // Cap distance to avoid division by zero or extreme values
      const safeB = Math.max(b, 1e-3);

      // Calculate deflection angle and cap it
      const alpha = (4 * G * bh.mass) / (c ** 2 * safeB);
      const incrementalAlpha = alpha / 10000;

      // Check for absorption
      if (b < bh.rs) {
        // console.log(`Ray absorbed at distance: ${b}, Schwarzschild radius: ${bh.rs}`);
        isAbsorbed = true;
        absorbedCount++;
        break;
      }

      // Calculate bending adjustment
      const vectorToBH = Vector3d.subtract(bh.position, ray.origin);
      const normalizedVectorToBH = Vector3d.normalize(vectorToBH);
      const bendingAdjustment = Vector3d.scale(normalizedVectorToBH, incrementalAlpha * (bh.rs / 10));

      // Apply bending adjustment and normalize
      ray.direction = Vector3d.add(ray.direction, bendingAdjustment);
      ray.direction.normalize();

      // Step forward
      ray.step(0.5); // Smaller step size for precision
    }

    // Render the pixel
    if (isAbsorbed) {
      ctx.fillStyle = "black"; // Black for absorbed rays
    } else {
      const color = background(ray);
      ctx.fillStyle = `rgb(${Math.floor(color.r)}, ${Math.floor(color.g)}, ${Math.floor(color.b)})`;
    }

    ctx.fillRect(x, y, 1, 1);
  }
}

console.log(absorbedCount, totalCount);

// Save the canvas as an image file
const out = fs.createWriteStream("output.png");
const stream = canvas.createPNGStream();
stream.pipe(out);
out.on("finish", () => {
  console.log("The image was created as output.png");
});
