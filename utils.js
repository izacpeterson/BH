import { Vector3d } from "./vectors.js";
const G = 6.6743e-11; // Gravitational constant m^3 kg^-1 s^-2
const c = 299792458; // Speed of Light m/s

export function normalize(value, minInput, maxInput, minOutput, maxOutput) {
  return ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
}
export function eulerDirectionUpdate(ray, blackHole, dt) {
  // Calculate the vector from the ray's origin to the black hole's position using Vector3d.subtract
  const toBlackHole = Vector3d.subtract(blackHole.position, ray.origin);

  // Calculate squared magnitude using the correct properties (u, v, w)
  const distanceSquared = toBlackHole.u ** 2 + toBlackHole.v ** 2 + toBlackHole.w ** 2;

  if (distanceSquared === 0) {
    return ray.direction; // Prevent division by zero
  }

  // Compute the deflection magnitude using your formula
  const deflectionMagnitude = (4 * G * blackHole.mass) / (c ** 2 * distanceSquared);

  // Compute the gravitational influence vector.
  // We divide by sqrt(distanceSquared) to normalize toBlackHole before scaling.
  const gravityInfluence = Vector3d.scale(toBlackHole, (deflectionMagnitude * dt) / Math.sqrt(distanceSquared));

  // Update the ray's direction by adding the gravitational influence.
  const newDirection = Vector3d.add(ray.direction, gravityInfluence);

  // Normalize the new direction
  const normalizedNewDirection = Vector3d.normalize(newDirection);

  return normalizedNewDirection;
}
