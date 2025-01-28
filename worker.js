import { parentPort, workerData } from "worker_threads";
import { Vector3d } from "./vectors.js";

// Define the BlackHole, Camera, and other necessary classes here
class BlackHole {
  constructor(position, mass) {
    this.position = position;
    this.mass = mass;
    this.rs = this.schwarzschildRadius(mass);
  }

  schwarzschildRadius(mass) {
    return (2 * 6.6743e-11 * mass) / 299792458 ** 2; // Gravitational constant G, speed of light c
  }
}

class Camera {
  constructor(position, lookAt, up, fov, aspectRatio) {
    this.position = position;
    this.lookAt = lookAt;
    this.up = up;
    this.fov = fov;
    this.aspectRatio = aspectRatio;

    this.forward = Vector3d.subtract(lookAt, position).normalize();
    this.right = Vector3d.cross(this.forward, up).normalize();
    this.trueUp = Vector3d.cross(this.right, this.forward);
    this.viewportHeight = 2 * Math.tan(fov / 2);
    this.viewportWidth = this.viewportHeight * aspectRatio;
  }

  generateRay(x, y, canvasWidth, canvasHeight) {
    const u = (x + 0.5) / canvasWidth - 0.5;
    const v = 0.5 - (y + 0.5) / canvasHeight;
    const horizontal = Vector3d.scale(this.right, u * this.viewportWidth);
    const vertical = Vector3d.scale(this.trueUp, v * this.viewportHeight);
    const rayDirection = Vector3d.add(this.forward, Vector3d.add(horizontal, vertical)).normalize();
    return new Ray(this.position, rayDirection);
  }
}

// Add other necessary class definitions (e.g., Ray) and helper functions
// Use workerData to get data from the main thread
const { canvasWidth, canvasHeight, startRow, endRow } = workerData;

const blackHole = new BlackHole(new Vector3d(0, 0, 0), 1.989e30);
const origin = new Vector3d(0, -100000, 0);
const direction = new Vector3d(0, 0, 0);
const fov = (90 * Math.PI) / 180;

const camera = new Camera(origin, direction, new Vector3d(0, 0, 1), fov, canvasWidth / canvasHeight);

const rowData = [];
let absorbed = 0;
let total = 0;

for (let y = startRow; y < endRow; y++) {
  for (let x = 0; x < canvasWidth; x++) {
    const ray = camera.generateRay(x, y, canvasWidth, canvasHeight);

    // Replace this with your ray tracing logic
    const distance = Vector3d.distance(ray.origin, blackHole.position);
    const isAbsorbed = distance < blackHole.rs;

    if (isAbsorbed) {
      absorbed++;
      rowData.push({ x, y, color: { r: 0, g: 0, b: 0 } });
    } else {
      rowData.push({ x, y, color: { r: 255, g: 255, b: 255 } }); // Example background
    }

    total++;
  }
}

// Send the results back to the main thread
parentPort.postMessage({ rowData, absorbed, total });
