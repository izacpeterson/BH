export class Vector2d {
  constructor(u, v) {
    this.u = u;
    this.v = v;
  }

  magnitude() {
    return Math.sqrt(this.u ** 2 + this.v ** 2);
  }

  static magnitude(vector) {
    return Math.sqrt(vector.u ** 2 + vector.v ** 2);
  }

  static add(v1, v2) {
    return new Vector2d(v1.u + v2.u, v1.v + v2.v);
  }

  static subtract(v1, v2) {
    return new Vector2d(v1.u - v2.u, v1.v - v2.v);
  }

  static dot(v1, v2) {
    return v1.u * v2.u + v1.v * v2.v;
  }

  static angle(v1, v2) {
    const cosTheta = this.dot(v1, v2) / (v1.magnitude() * v2.magnitude());
    return Math.acos(cosTheta);
  }

  static distance(v1, v2) {
    return Math.sqrt((v2.u - v1.u) ** 2 + (v2.v - v1.v) ** 2);
  }

  scale(value) {
    this.u *= value;
    this.v *= value;
  }

  static scale(vector, value) {
    return new Vector2d(vector.u * value, vector.v * value);
  }
}

export class Vector3d {
  constructor(u, v, w) {
    this.u = u;
    this.v = v;
    this.w = w;
  }

  print() {
    return `${this.u}, ${this.v}, ${this.w}`;
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

// Example usage of Vector2d (for testing)
let vector = new Vector2d(0, -36);
let vector2 = new Vector2d(-36, 0);
// console.log(vector.magnitude());
// console.log(Vector2d.subtract(vector, vector2));
// console.log(Vector2d.dot(vector, vector2));
// console.log(Vector2d.angle(vector, vector2));
// console.log(vector);
// vector.scale(2);
// console.log(Vector2d.scale(vector, 2));
// console.log(Vector2d.distance(vector, vector2));
