import { Vector3d } from "./vectors.js";

export class BlackHole {
  constructor(position, mass) {
    this.position = position; // Vector3d
    this.mass = mass;

    this.rs = this.schwarzschildRadius(mass);
    // Removed scaleFactor
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
    this.origin = Vector3d.add(this.origin, Vector3d.scale(this.direction, stepSize));
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

    const rayDirection = Vector3d.add(this.forward, Vector3d.add(horizontal, vertical));

    rayDirection.normalize();

    return new Ray(this.position, rayDirection);
  }
}
