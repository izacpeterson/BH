import { createCanvas } from "canvas";
import fs from "fs";

import { Vector3d } from "./vectors.js";
// Set up canvas dimensions
const canvasWidth = 800;
const canvasHeight = 400;
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

let bh = new BlackHole(new Vector3d(0, -100, 0), mass);

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

function rayIntersectsSphere(ray, sphere) {
  const oc = Vector3d.subtract(ray.origin, sphere.position); // Vector from ray origin to sphere center
  const a = Vector3d.dot(ray.direction, ray.direction);
  const b = 2.0 * Vector3d.dot(oc, ray.direction);
  const c = Vector3d.dot(oc, oc) - sphere.rs ** 2;
  const discriminant = b ** 2 - 4 * a * c;

  if (discriminant < 0) {
    return null; // No intersection
  } else {
    const t1 = (-b - Math.sqrt(discriminant)) / (2.0 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2.0 * a);
    return Math.min(t1, t2); // Return the closest intersection point
  }
}

let origin = new Vector3d(0, 0, 0);
let direction = new Vector3d(0, -100, 0);

// let ray = new Ray(origin, direction);

// console.log(ray.getPoint(4));

let cam = new Camera(origin, direction, new Vector3d(0, 0, 90), 90, canvasWidth / canvasHeight);

console.log(cam.right);

function background(ray) {
  const t = 0.5 * (ray.direction.w + 1); // Map y from [-1, 1] to [0, 1]
  const startColor = { r: 255, g: 255, b: 255 }; // White
  const endColor = { r: 135, g: 206, b: 235 }; // Sky blue

  // Linear interpolation between startColor and endColor
  return {
    r: (1 - t) * startColor.r + t * endColor.r,
    g: (1 - t) * startColor.g + t * endColor.g,
    b: (1 - t) * startColor.b + t * endColor.b,
  };
}

for (let y = 0; y < canvasHeight; y++) {
  for (let x = 0; x < canvasWidth; x++) {
    const ray = cam.generateRay(x, y, canvasWidth, canvasHeight);

    // Check for intersection with the black hole
    const t = rayIntersectsSphere(ray, bh);

    if (t !== null) {
      // The ray hits the black hole
      ctx.fillStyle = "black";
    } else {
      // Render the background
      const color = background(ray);
      ctx.fillStyle = `rgb(${Math.floor(color.r)}, ${Math.floor(color.g)}, ${Math.floor(color.b)})`;
    }

    ctx.fillRect(x, y, 1, 1);
  }
}

// ctx.beginPath();
// ctx.arc(canvasWidth / 2, canvasHeight / 2, scaledRs, 0, 2 * Math.PI);
// ctx.fillStyle = "black";
// ctx.fill();

// Save the canvas as an image file
const out = fs.createWriteStream("output.png");
const stream = canvas.createPNGStream();
stream.pipe(out);
out.on("finish", () => {
  console.log("The image was created as output.png");
});
