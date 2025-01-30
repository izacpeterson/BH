import { BlackHole } from "./bh.js";
import { Vector3d } from "./vectors.js";

const G = 6.6743e-11;
const mass = 1.989e30; // Mass of the Sun in kilograms
const position = new Vector3d(0, 0, 0);
const bh = new BlackHole(position, mass);

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = 1000;
canvas.height = 1000;
const ctx = canvas.getContext("2d");

export class Particle {
  constructor(position, bh) {
    this.bh = bh;
    this.position = position;
    this.distanceFromBH = Vector3d.distance(position, bh.position);
    this.velocityMagnitude = Math.sqrt((G * bh.mass) / this.distanceFromBH);
    // let variance = 10000000;
    // this.velocityMagnitude += Math.random() * variance - variance / 2;

    let radialDirection = Vector3d.normalize(Vector3d.subtract(this.position, this.bh.position));
    let arbitraryVector = new Vector3d(0, 0, 1);
    let velocityDirection = Vector3d.normalize(Vector3d.cross(radialDirection, arbitraryVector));

    if (velocityDirection.magnitude() === 0) {
      velocityDirection = new Vector3d(1, 0, 0);
    }

    this.velocityVector = Vector3d.multiply(velocityDirection, this.velocityMagnitude);
  }

  update(deltaTime) {
    this.position.w += Math.random() * 100 - 50;
    let direction = Vector3d.subtract(this.bh.position, this.position);
    let distance = Vector3d.distance(this.bh.position, this.position);
    let forceMagnitude = (G * this.bh.mass) / distance ** 2;

    let acceleration = Vector3d.multiply(Vector3d.normalize(direction), forceMagnitude);

    this.velocityVector.add(Vector3d.multiply(acceleration, deltaTime));
    this.position.add(Vector3d.multiply(this.velocityVector, deltaTime));
  }
}

// Create Particles
let particles = [];
for (let i = 0; i < 10000; i++) {
  let randomX = Math.random() * bh.rs * 10 - bh.rs * 5;
  let randomY = Math.random() * bh.rs * 10 - bh.rs * 5;

  let randomZ = 0;

  let part = new Particle(new Vector3d(randomX, randomY, randomZ), bh);
  let distanceFromBH = Vector3d.distance(bh.position, part.position);
  if (distanceFromBH > bh.rs * 1 && distanceFromBH < bh.rs * 5) {
    particles.push(part);
  }
}

const timeStep = 0.000001;

function normalize(value, minInput, maxInput, minOutput, maxOutput) {
  return ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
}

// Animation loop
function animate() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  particles.forEach((part) => {
    part.update(timeStep);
    // console.log(part.velocityVector.magnitude());
    let brightness = normalize(part.velocityVector.magnitude(), 90000000, 150000000, 50, 255);
    // console.log(brightness);
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    let x = normalize(part.position.u, -bh.rs * 10, bh.rs * 10, 0, canvas.width);
    let y = normalize(part.position.v, -bh.rs * 10, bh.rs * 10, canvas.height, 0); // Flip Y
    ctx.fillRect(x, y, 2, 2);
  });

  requestAnimationFrame(animate);
}

animate();
