class Vector2d {
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

let vector = new Vector2d(0, -36);
let vector2 = new Vector2d(-36, 0);

// console.log(vector.magnitude());

// console.log(Vector2d.subtract(vector, vector2));

// console.log(Vector2d.dot(vector, vector2));

// console.log(Vector2d.angle(vector, vector2));

// console.log(vector);
// vector.scale(2);

// console.log(Vector2d.scale(vector, 2));

console.log(Vector2d.distance(vector, vector2));
