import { GPU } from "gpu.js";
import { Vector3d } from "./vectors.js";
import { BlackHole, Ray, Camera } from "./bh.js";
import { createCanvas, loadImage } from "canvas";
import fs from "fs";
const gpu = new GPU();

const width = 1920;
const height = 1080;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

const G = 6.6743e-11; // Gravitational constant m^3 kg^-1 s^-2
const c = 299792458; // Speed of Light m/s

const mass = 1.989e30; // Mass of the Sun in kilograms

const bhPos = new Vector3d(0, 0, 0);
let bh = new BlackHole(bhPos, mass);

console.log("The Schwarzschild radius is ${bh.rs} meters.");

// Camera setup
let origin = new Vector3d(0, 50000, 0);
let direction = new Vector3d(bhPos); // Look towards the black hole

const fov = 90;
const fovInRadians = (fov * Math.PI) / 180;

let cam = new Camera(origin, direction, new Vector3d(0, 0, 1), fovInRadians, width / height);

let particleArray = [];

for (let i = 0; i < 1000; i++) {
  let x = Math.random() * 10000 - 5000;
  let y = Math.random() * 10000 - 5000;
  let z = Math.random() * 10000 - 5000;

  particleArray.push([x, y, z]);
}

// console.log(particleArray);

const marcher = gpu
  .createKernel(function () {
    const x = this.thread.x;
    const y = this.thread.y;

    const width = this.constants.width;
    const height = this.constants.height;

    const aspectRatio = width / height;

    const fov = Math.PI / 2;
    const camPosition = [0, 100000, 0]; // Camera position

    const u = (x / width - 0.5) * aspectRatio * Math.tan(fov / 2);
    const v = (0.5 - y / height) * Math.tan(fov / 2);

    const rayOrigin = [camPosition[0], camPosition[1], camPosition[2]];
    const rayDirection = [u, -1, v];

    // Normalize the ray direction
    const directionMagnitude = Math.sqrt(rayDirection[0] ** 2 + rayDirection[1] ** 2 + rayDirection[2] ** 2);

    rayDirection[0] /= directionMagnitude;
    rayDirection[1] /= directionMagnitude;
    rayDirection[2] /= directionMagnitude;

    const bh = [0, 0, 0, 2954]; // Black hole with larger radius for testing

    let stepSize = 10; // Increase step size for faster movement
    let distance = 0;

    for (let i = 0; i < 10000; i++) {
      // Distance to black hole
      const dx = rayOrigin[0] - bh[0];
      const dy = rayOrigin[1] - bh[1];
      const dz = rayOrigin[2] - bh[2];
      distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);

      // Check if ray is absorbed (inside Schwarzschild radius)
      if (distance < bh[3]) {
        return [0, 0, 0]; // Black pixel for absorbed rays
      }

      // Move the ray forward
      rayOrigin[0] += rayDirection[0] * stepSize;
      rayOrigin[1] += rayDirection[1] * stepSize;
      rayOrigin[2] += rayDirection[2] * stepSize;
    }

    return [255, 255, 255];
  })
  .setOutput([width, height])
  .setConstants({
    width: width,
    height: height,
  });

let res = marcher();
// console.log(marcher());

const square = gpu
  .createKernel(function (a) {
    return a[this.thread.x] * a[this.thread.x];
  })
  .setOutput([10]);

const result = square([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
console.log(result);

// Render the result to the canvas
const imageData = ctx.createImageData(width, height);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4; // Index in the image data array
    const color = res[y][x]; // Get RGB values from the GPU kernel result

    imageData.data[idx] = color[0]; // Red
    imageData.data[idx + 1] = color[1]; // Green
    imageData.data[idx + 2] = color[2]; // Blue
    imageData.data[idx + 3] = 255; // Alpha (fully opaque)
  }
}

ctx.putImageData(imageData, 0, 0);

// Save the canvas as an image file
const out = fs.createWriteStream("output.png");
const stream = canvas.createPNGStream();
stream.pipe(out);
out.on("finish", () => {
  console.log("The image has been saved as output.png");
});
