import { createCanvas } from "canvas";
import fs from "fs";

import { Vector3d } from "./vectors.js";
// Set up canvas dimensions
const canvasWidth = 512;
const canvasHeight = 256;
const canvas = createCanvas(canvasWidth, canvasHeight);
const ctx = canvas.getContext("2d");

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

let origin = new Vector3d(0, 0, 0);
let direction = new Vector3d(0, 10, 0);

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

// Render to the canvas
// Render to the canvas
for (let y = 0; y < canvasHeight; y++) {
  // Loop over rows (height)
  for (let x = 0; x < canvasWidth; x++) {
    // Loop over columns (width)
    const ray = cam.generateRay(x, y, canvasWidth, canvasHeight); // Correct order: x, y

    const color = background(ray);

    ctx.fillStyle = `rgb(${Math.floor(color.r)}, ${Math.floor(color.g)}, ${Math.floor(color.b)})`;
    ctx.fillRect(x, y, 1, 1); // Correct order: x, y
  }
}

// Save the canvas as an image file
const out = fs.createWriteStream("output.png");
const stream = canvas.createPNGStream();
stream.pipe(out);
out.on("finish", () => {
  console.log("The image was created as output.png");
});
