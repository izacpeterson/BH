const WIDTH = 1920 / 2;
const HEIGHT = 1080 / 2;

const G = 6.6743e-11; // Gravitational constant m^3 kg^-1 s^-2
const c = 299792458; // Speed of Light m/s

const SOLAR_MASS = 1.989e30;

export class Vector3d {
  constructor(u, v, w) {
    this.u = u;
    this.v = v;
    this.w = w;
  }

  print() {
    return `${this.u}, ${this.v}, ${this.w}`;
  }

  magnitudeSquared() {
    return this.u ** 2 + this.v ** 2 + this.w ** 2;
  }

  flatten() {
    return [this.u, this.v, this.w];
  }

  multiply(scalar) {
    return new Vector3d(this.u * scalar, this.v * scalar, this.w * scalar);
  }

  static multiply(v, scalar) {
    return new Vector3d(v.u * scalar, v.v * scalar, v.w * scalar);
  }

  static fromArray(array) {
    if (array.length !== 3) {
      throw new Error(
        "Array must have exactly 3 elements to create a Vector3d."
      );
    }
    return new Vector3d(array[0], array[1], array[2]);
  }

  // Normalize this vector in place.
  normalize() {
    const mag = this.magnitude();
    if (mag === 0) {
      return;
    }
    this.u /= mag;
    this.v /= mag;
    this.w /= mag;
    return this; // Returning this can be useful.
  }

  // Return a normalized copy of the vector.
  static normalize(vector) {
    const mag = vector.magnitude();
    if (mag === 0) {
      throw new Error("Cannot normalize a vector with magnitude 0");
    }
    return new Vector3d(vector.u / mag, vector.v / mag, vector.w / mag);
  }

  magnitude() {
    return Math.sqrt(this.u ** 2 + this.v ** 2 + this.w ** 2);
  }

  static magnitude(vector) {
    return Math.sqrt(vector.u ** 2 + vector.v ** 2 + vector.w ** 2);
  }

  add(v) {
    this.u += v.u;
    this.v += v.v;
    this.w += v.w;
    return this;
  }

  static add(v1, v2) {
    return new Vector3d(v1.u + v2.u, v1.v + v2.v, v1.w + v2.w);
  }

  static subtract(v1, v2) {
    return new Vector3d(v1.u - v2.u, v1.v - v2.v, v1.w - v2.w);
  }

  static dot(v1, v2) {
    return v1.u * v2.u + v1.v * v2.v + v1.w * v2.w;
  }

  static cross(v1, v2) {
    return new Vector3d(
      v1.v * v2.w - v1.w * v2.v,
      v1.w * v2.u - v1.u * v2.w,
      v1.u * v2.v - v1.v * v2.u
    );
  }

  static angle(v1, v2) {
    const cosTheta = this.dot(v1, v2) / (v1.magnitude() * v2.magnitude());
    return Math.acos(cosTheta);
  }

  static distance(v1, v2) {
    return Math.sqrt(
      (v2.u - v1.u) ** 2 + (v2.v - v1.v) ** 2 + (v2.w - v1.w) ** 2
    );
  }

  scale(value) {
    this.u *= value;
    this.v *= value;
    this.w *= value;
    return this;
  }

  static scale(vector, value) {
    return new Vector3d(vector.u * value, vector.v * value, vector.w * value);
  }

  // --- Added divide method ---
  divide(scalar) {
    return new Vector3d(this.u / scalar, this.v / scalar, this.w / scalar);
  }
}

export class Particle {
  constructor(position, bh, temp) {
    this.bh = bh;
    this.position = position;
    this.distanceFromBH = Vector3d.distance(position, bh.position);

    this.temp = temp;

    // Calculate the velocity magnitude based on gravitational attraction
    this.velocityMagnitude = Math.sqrt((G * bh.mass) / this.distanceFromBH);
    this.variance = Math.random() - 0.5;
    // let variance = 60000000;
    // this.velocityMagnitude += Math.random() * variance - variance / 2;

    // Determine the tangential direction for orbit
    const radialDirection = Vector3d.normalize(
      Vector3d.subtract(this.position, this.bh.position)
    );
    const arbitraryVector = new Vector3d(0, 0, 1);
    let velocityDirection = Vector3d.normalize(
      Vector3d.cross(radialDirection, arbitraryVector)
    );

    // Fallback direction if cross product is zero
    if (velocityDirection.magnitude() === 0) {
      velocityDirection = new Vector3d(1, 0, 0);
    }

    // Set the initial velocity vector
    this.velocityVector = Vector3d.multiply(
      velocityDirection,
      this.velocityMagnitude
    );
  }

  update(deltaTime) {
    // Add a small random wobble to the position (simulate perturbations)
    this.position.w += Math.random() * 100 - 50;

    // Calculate the gravitational force
    const direction = Vector3d.subtract(this.bh.position, this.position);
    const distance = Vector3d.distance(this.bh.position, this.position);
    const forceMagnitude = (G * this.bh.mass) / distance ** 2;

    // Compute the acceleration vector
    const acceleration = Vector3d.multiply(
      Vector3d.normalize(direction),
      forceMagnitude
    );

    // Update velocity and position based on the acceleration
    this.velocityVector.add(Vector3d.multiply(acceleration, deltaTime));
    this.position.add(Vector3d.multiply(this.velocityVector, deltaTime));
  }
}

export class BlackHole {
  constructor(position, mass, spin = 0) {
    this.position = position; // Vector3d
    this.mass = mass;
    this.spin = spin; // Dimensionless spin parameter (0 ≤ a ≤ 1)

    this.rs = this.schwarzschildRadius(mass);
    this.a = this.spin * this.rs; // Kerr spin parameter (a = J/Mc)

    // Assume spin axis is along the z-axis (can be modified if needed)
    this.spinAxis = new Vector3d(0, 0, 1);
  }

  schwarzschildRadius(mass) {
    const G = 6.6743e-11; // Gravitational constant m^3 kg^-1 s^-2
    const c = 299792458; // Speed of Light m/s
    return (2 * G * mass) / c ** 2;
  }
}

export class Ray {
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
    this.origin = Vector3d.add(
      this.origin,
      Vector3d.scale(this.direction, stepSize)
    );
  }
}

export class Camera {
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

    const rayDirection = Vector3d.add(
      this.forward,
      Vector3d.add(horizontal, vertical)
    );

    rayDirection.normalize();

    return new Ray(this.position, rayDirection);
  }
}

export function normalize(value, minInput, maxInput, minOutput, maxOutput) {
  return (
    ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) +
    minOutput
  );
}
export function eulerDirectionUpdate(ray, blackHole, dt) {
  // Calculate the vector from the ray's origin to the black hole's position using Vector3d.subtract
  const toBlackHole = Vector3d.subtract(blackHole.position, ray.origin);

  // Calculate squared magnitude using the correct properties (u, v, w)
  const distanceSquared =
    toBlackHole.u ** 2 + toBlackHole.v ** 2 + toBlackHole.w ** 2;

  if (distanceSquared === 0) {
    return ray.direction; // Prevent division by zero
  }

  // Compute the deflection magnitude using your formula
  const deflectionMagnitude =
    (4 * G * blackHole.mass) / (c ** 2 * distanceSquared);

  // Compute the gravitational influence vector.
  // We divide by sqrt(distanceSquared) to normalize toBlackHole before scaling.
  const gravityInfluence = Vector3d.scale(
    toBlackHole,
    (deflectionMagnitude * dt) / Math.sqrt(distanceSquared)
  );

  // Update the ray's direction by adding the gravitational influence.
  const newDirection = Vector3d.add(ray.direction, gravityInfluence);

  // Normalize the new direction
  const normalizedNewDirection = Vector3d.normalize(newDirection);

  return normalizedNewDirection;
}

export function hsvToRgb(h, s, v) {
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
diskCanvas.width = 1000;
diskCanvas.height = 1000;
const diskCtx = diskCanvas.getContext("2d");

for (let i = 0; i < 50; i++) {
  // Draw a semi-transparent rectangle to create trailing effect
  diskCtx.fillStyle = "rgba(0, 0, 0, 0.01)";
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
    diskCtx.arc(x, y, 2, 0, Math.PI * 2);
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
