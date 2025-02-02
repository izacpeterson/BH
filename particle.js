import { Vector3d } from "./vectors.js";

const G = 6.6743e-11; // Gravitational constant m^3 kg^-1 s^-2

export class Particle {
  constructor(position, bh) {
    this.bh = bh;
    this.position = position;
    this.distanceFromBH = Vector3d.distance(position, bh.position);

    // Calculate the velocity magnitude based on gravitational attraction
    this.velocityMagnitude = Math.sqrt((G * bh.mass) / this.distanceFromBH);
    this.velocityMagnitude += Math.random() * 100000000;

    // Determine the tangential direction for orbit
    const radialDirection = Vector3d.normalize(Vector3d.subtract(this.position, this.bh.position));
    const arbitraryVector = new Vector3d(0, 0, 1);
    let velocityDirection = Vector3d.normalize(Vector3d.cross(radialDirection, arbitraryVector));

    // Fallback direction if cross product is zero
    if (velocityDirection.magnitude() === 0) {
      velocityDirection = new Vector3d(1, 0, 0);
    }

    // Set the initial velocity vector
    this.velocityVector = Vector3d.multiply(velocityDirection, this.velocityMagnitude);
  }

  update(deltaTime) {
    // Add a small random wobble to the position (simulate perturbations)
    this.position.w += Math.random() * 100 - 50;

    // Calculate the gravitational force
    const direction = Vector3d.subtract(this.bh.position, this.position);
    const distance = Vector3d.distance(this.bh.position, this.position);
    const forceMagnitude = (G * this.bh.mass) / distance ** 2;

    // Compute the acceleration vector
    const acceleration = Vector3d.multiply(Vector3d.normalize(direction), forceMagnitude);

    // Update velocity and position based on the acceleration
    this.velocityVector.add(Vector3d.multiply(acceleration, deltaTime));
    this.position.add(Vector3d.multiply(this.velocityVector, deltaTime));
  }
}
