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
    let uSum = v1.u + v2.u;
    let vSum = v1.v + v2.v;

    return new Vector2d(uSum, vSum);
  }

  static subtract(v1, v2) {
    let udiff = v1.u - v2.u;
    let vdiff = v1.v - v2.v;

    return new Vector2d(udiff, vdiff);
  }

  static dot(v1, v2) {
    let mult1 = v1.u * v2.u;
    let mult2 = v1.v * v2.v;

    return mult1 + mult2;
  }

  static angle(v1, v2) {
    let cosTheta = this.dot(v1, v2) / (v1.magnitude() * v2.magnitude());
    let rads = Math.acos(cosTheta);

    return rads;
  }

  static distance(v1, v2) {
    const diffU = v2.u - v1.u;
    const diffV = v2.v - v1.v;
    return Math.sqrt(diffU ** 2 + diffV ** 2);
  }

  scale(value) {
    this.u = this.u * value;
    this.v = this.v * value;
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

  // Flatten the vector into an array [u, v, w]
  flatten() {
    return [this.u, this.v, this.w];
  }

  static multiply(v, scalar) {
    return new Vector3d(v.u * scalar, v.v * scalar, v.w * scalar);
  }

  // Create a Vector3d object from an array [u, v, w]
  static fromArray(array) {
    if (array.length !== 3) {
      throw new Error("Array must have exactly 3 elements to create a Vector3d.");
    }
    return new Vector3d(array[0], array[1], array[2]);
  }

  normalize() {
    const mag = this.magnitude();
    if (mag === 0) {
      // throw new Error("Cannot normalize a vector with magnitude 0");
      return;
    }
    this.u /= mag;
    this.v /= mag;
    this.w /= mag;
  }

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
  }

  static add(v1, v2) {
    let uSum = v1.u + v2.u;
    let vSum = v1.v + v2.v;
    let wSum = v1.w + v2.w;

    return new Vector3d(uSum, vSum, wSum);
  }

  static subtract(v1, v2) {
    let uDiff = v1.u - v2.u;
    let vDiff = v1.v - v2.v;
    let wDiff = v1.w - v2.w;

    return new Vector3d(uDiff, vDiff, wDiff);
  }

  static dot(v1, v2) {
    // console.log(v1, v2)
    let mult1 = v1.u * v2.u;
    let mult2 = v1.v * v2.v;
    let mult3 = v1.w * v2.w;

    return mult1 + mult2 + mult3;
  }

  static cross(v1, v2) {
    let uCross = v1.v * v2.w - v1.w * v2.v;
    let vCross = v1.w * v2.u - v1.u * v2.w;
    let wCross = v1.u * v2.v - v1.v * v2.u;

    return new Vector3d(uCross, vCross, wCross);
  }

  static angle(v1, v2) {
    let cosTheta = this.dot(v1, v2) / (v1.magnitude() * v2.magnitude());
    let rads = Math.acos(cosTheta);

    return rads;
  }

  static distance(v1, v2) {
    const diffU = v2.u - v1.u;
    const diffV = v2.v - v1.v;
    const diffW = v2.w - v1.w;
    return Math.sqrt(diffU ** 2 + diffV ** 2 + diffW ** 2);
  }

  scale(value) {
    this.u = this.u * value;
    this.v = this.v * value;
    this.w = this.w * value;
  }

  static scale(vector, value) {
    return new Vector3d(vector.u * value, vector.v * value, vector.w * value);
  }
}
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
