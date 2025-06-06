import { createCanvas, loadImage } from "canvas";
import fs from "fs";

import { Vector3d } from "./vectors.js";

// Set up canvas dimensions
const canvasWidth = 1920 / 3;
const canvasHeight = 1080 / 3;
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

class Particle {
  constructor(position) {
    this.position = position;
  }
}

function normalize(value, minInput, maxInput, minOutput, maxOutput) {
  return ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
}

const diskImagePath = "disk.png"; // Path to your image
let diskCanvas, diskCtx;

// Load the image ONCE and store pixel data
function loadDiskImageSync(imagePath) {
  return new Promise((resolve, reject) => {
    loadImage(imagePath)
      .then((image) => {
        diskCanvas = createCanvas(image.width, image.height);
        diskCtx = diskCanvas.getContext("2d");

        diskCtx.drawImage(image, 0, 0);
        console.log(`✅ Image loaded: ${imagePath}`);
        resolve();
      })
      .catch((err) => reject(err));
  });
}

await loadDiskImageSync(diskImagePath);

// **Synchronous pixel sampling (after image is preloaded)**
function getPixelColor(x, y) {
  if (!diskCtx) {
    console.error("❌ Image not loaded!");
    return "rgba(0, 0, 0, 0)";
  }

  const imageData = diskCtx.getImageData(x, y, 1, 1).data;
  const [r, g, b, a] = imageData;

  return `rgba(${r}, ${g}, ${b}, 1)`;
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
  const gridSize = 101; // Number of grid cells
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
  // Calculate the vector pointing toward the black hole
  const toBlackHole = Vector3d.subtract(blackHole.position, ray.origin);
  const normalizedToBlackHole = Vector3d.normalize(toBlackHole);

  // Calculate deflection angle and scale the effect
  const deflectionAngle = calculateDeflectionAngle(b, blackHole);
  const scaledDeflection = Vector3d.scale(normalizedToBlackHole, deflectionAngle * 0.001);

  // Adjust the ray's direction vector and normalize it
  const newDirection = Vector3d.add(ray.direction, scaledDeflection);
  return Vector3d.normalize(newDirection);
}

function rungeKuttaDirectionUpdate(ray, blackHole, dt) {
  const gravityFunc = (position, direction) => {
    const toBlackHole = Vector3d.subtract(blackHole.position, position);
    const normalizedToBlackHole = Vector3d.normalize(toBlackHole);

    // Deflection proportional to Schwarzschild radius and inverse of squared distance
    const distance = Vector3d.magnitude(toBlackHole);
    const deflectionMagnitude = (4 * G * blackHole.mass) / (c ** 2 * distance ** 2);

    return Vector3d.scale(normalizedToBlackHole, deflectionMagnitude);
  };

  const position = ray.origin;
  const direction = ray.direction;

  // Runge-Kutta steps
  const k1 = gravityFunc(position, direction);
  const k2 = gravityFunc(Vector3d.add(position, Vector3d.scale(direction, dt / 2)), Vector3d.add(direction, Vector3d.scale(k1, dt / 2)));
  const k3 = gravityFunc(Vector3d.add(position, Vector3d.scale(direction, dt / 2)), Vector3d.add(direction, Vector3d.scale(k2, dt / 2)));
  const k4 = gravityFunc(Vector3d.add(position, Vector3d.scale(direction, dt)), Vector3d.add(direction, Vector3d.scale(k3, dt)));

  // Update the direction
  const newDirection = Vector3d.add(direction, Vector3d.scale(Vector3d.add(Vector3d.add(k1, Vector3d.scale(k2, 2)), Vector3d.add(Vector3d.scale(k3, 2), k4)), dt / 6));

  return Vector3d.normalize(newDirection);
}

function hsvToRgb(h, s, v) {
  let r, g, b;
  let i = Math.floor(h * 6);
  let f = h * 6 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Example usage
const mass = 1.989e30; // Mass of the Sun in kilograms

// Adjusted black hole position without scaling
let bh = new BlackHole(new Vector3d(0, 0, 0), mass); // Changed from (0, -1000, 0) to (0, -100000, 0)

console.log(`The Schwarzschild radius is ${bh.rs} meters.`);

// Camera setup
let origin = new Vector3d(0, 500000, 20000);
let direction = new Vector3d(0, 0, 0); // Look towards the black hole

const fov = 15;
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
let stepSize = 1000; // Increased step size to cover larger distances
let iterations = Math.ceil(cameraDistanceToBH / stepSize) * 2; // Ensure sufficient iterations

// Ray tracing loop with adjusted step size and iterations// Ray tracing loop with dynamic step sizing
// Ray tracing loop with dynamic step sizing and minimum step size
const minStepSize = 1000; // Minimum step size in meters (adjust as needed)

let diskHeight = 200;
let diskOuterRadius = 60000;
let diskInnerRadius = bh.rs * 2.6;

let particles = [];
for (let i = 0; i < 5000; i++) {
  let u = Math.random() * 100000 - 50000;
  let v = Math.random() * 100000 - 50000;
  let w = Math.random() * diskHeight - diskHeight / 2;

  let vec = new Vector3d(u, v, w);

  if (Vector3d.distance(bh, vec) < diskOuterRadius && Vector3d.distance(bh, vec) > diskInnerRadius) {
    continue;
  }

  // console.log(vec);

  let part = new Particle(vec);

  // console.log(part.position.w);

  particles.push(new Particle(vec));
}

// console.log(particles);

// Ray tracing loop with dynamic step sizing and 'red cross' rendering

let rayCount = 0;
let skipped = 0;
for (let y = 0; y < canvasHeight; y++) {
  for (let x = 0; x < canvasWidth; x++) {
    stepSize = 1000;
    const ray = cam.generateRay(x, y, canvasWidth, canvasHeight);

    // const b = calculateImpactParameter(ray, bh);

    totalCount++;
    let isAbsorbed = false;
    let crossedZero = false;
    let hitParticle = false;

    // Dynamically trace the ray
    let steps = 0; // Track steps to prevent infinite loops
    let finDistance = 0;
    let finPos;

    // console.log(Vector3d.distance(ray.origin, bh.position), bh.rs * 2);

    const photonSphereRadius = 1.5 * bh.rs;
    let photonOrbitCount = 0; // Track how long a ray spends near the photon sphere
    const photonOrbitThreshold = 10; // Define a threshold for a ray to be considered part of the photon ring

    while (true) {
      // const isNearBH = Vector3d.distance(ray.origin, bh.position) < bh.rs * 50; // Expanding threshold
      // if (!isNearBH) {
      //   skipped++;
      //   console.log(skipped, totalCount);
      //   continue;
      // }

      const distance = distanceToBlackHole(ray, bh);
      finDistance = distance;
      finPos = ray.origin;

      // If the ray enters the photon sphere, track how long it stays there
      if (distance < photonSphereRadius * 1.1 && distance > photonSphereRadius * 0.9) {
        // console.log("photon sphere");
        stepSize = 120;
        // console.log(photonOrbitCount);
        photonOrbitCount++;
      }

      // If a ray spends a long time near the photon sphere before escaping, mark it as photon ring
      if (photonOrbitCount > photonOrbitThreshold) {
        // console.log("photon break");
        break; // Exit the loop and color this ray in the photon ring color
      }

      if (x == Math.round(canvasWidth / 2) && y == Math.round(canvasHeight / 2)) {
        console.log(distance);
      }

      // Check if the ray crosses the "up" axis (w component crosses 0)
      const prevW = ray.origin.w;
      ray.step(stepSize); // Move the ray forward
      const currentW = ray.origin.w;

      // if (currentW < 0 + diskHeight && currentW > 0 - diskHeight && distance < diskOuterRadius && distance > diskInnerRadius) {
      //   particles.forEach((part) => {
      //     // console.log(part);

      //     let distance = Vector3d.distance(part.position, ray.origin);
      //     // console.log(distance);

      //     // let maxDis = Math.random() * 100 + 100;
      //     if (distance < 200) {
      //       hitParticle = true;
      //       return;
      //     }
      //   });
      // }

      if (prevW * currentW < 0 && distance < 75000 && distance > 10000) {
        // Detect crossing zero
        crossedZero = true;
        break;
      }

      // if (prevW * currentW < 0) {
      //   // Detect crossing zero
      //   crossedZero = true;
      //   break;
      // }

      // Check for absorption
      if (distance < bh.rs) {
        isAbsorbed = true;
        absorbedCount++;
        break;
      }

      if (distance > 100000) {
        stepSize = 10000;
      } else {
        stepSize = 500;
      }

      if (hitParticle) break;

      // Check for escape condition
      const escapeDistance = cameraDistanceToBH * 1.1; // Arbitrary escape threshold
      if (distance > escapeDistance) {
        // console.log("escape");
        break;
      }

      // Update ray direction using Runge-Kutta
      ray.direction = rungeKuttaDirectionUpdate(ray, bh, stepSize);

      // Increment step counter and exit if too many steps
      steps++;
      if (steps > 10000) {
        // console.warn("Ray exceeded maximum step count, terminating.");
        break;
      }
    }

    // Render the pixel

    if (isAbsorbed) {
      ctx.fillStyle = "black"; // Black for absorbed rays
    } else if (photonOrbitCount > photonOrbitThreshold) {
      ctx.fillStyle = "white"; // Photon ring glow
    } else if (hitParticle) {
      function normalize(value, minInput, maxInput, minOutput, maxOutput) {
        return ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
      }

      let scaledDistance = normalize(finDistance, diskOuterRadius, diskInnerRadius, 0, 1);
      // ctx.fillStyle = `rgb(${scaledDistance}, ${scaledDistance}, ${scaledDistance})`;

      let color = hsvToRgb(0.6, 0.8 - scaledDistance, scaledDistance);
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;

      // ctx.fillStyle = "white";
    } else if (crossedZero) {
      ctx.fillStyle = "red"; // Red for rays crossing the up axis

      function normalize(value, minInput, maxInput, minOutput, maxOutput) {
        return ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
      }

      // console.log(finPos);

      let scaledDistance = normalize(finDistance, diskOuterRadius, diskInnerRadius, 0, 1);
      // ctx.fillStyle = `rgb(${scaledDistance}, ${scaledDistance}, ${scaledDistance})`;

      // let color = hsvToRgb(0.6, 0.8 - scaledDistance, scaledDistance);
      // ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;

      let x = Math.floor(normalize(finPos.u, 0 - bh.rs * 40, bh.rs * 40, 0, 1000));
      let y = Math.floor(normalize(finPos.v, 0 - bh.rs * 40, bh.rs * 40, 0, 1000));

      let color = getPixelColor(x, y);
      // console.log(color);
      if (color !== "rgba(0, 0, 0, 0)") {
        // console.log(color);
      }

      ctx.fillStyle = color;
    } else {
      // const color = background(ray);
      // ctx.fillStyle = `rgb(${Math.floor(color.r)}, ${Math.floor(color.g)}, ${Math.floor(color.b)})`;
      ctx.fillStyle = "black";
    }

    // ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
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
