/*************************************************************
 * Ray Tracing in One Weekend -- JavaScript (Node) Edition
 *
 * Produces a PPM-format image on standard output. Run via:
 *    node raytracer.js > output.ppm
 *
 * The result is a "random spheres" scene with multiple
 * materials, defocus blur, and global illumination via
 * path tracing.
 *************************************************************/

/*************************************************************
 * Utility: Basic Constants and Random
 *************************************************************/

const PI = 3.141592653589793;
const INF = Number.POSITIVE_INFINITY;

/** Convert degrees to radians. */
function degreesToRadians(deg) {
  return (deg * PI) / 180.0;
}

/** Uniform random in [0,1). */
function randomDouble() {
  return Math.random(); // JavaScript's Math.random() is [0,1).
}

/** Uniform random in [min, max). */
function randomDoubleRange(min, max) {
  return min + (max - min) * randomDouble();
}

/*************************************************************
 * Vec3: 3D Vector and "Color"
 *************************************************************/
class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.e = [x, y, z];
  }

  x() {
    return this.e[0];
  }
  y() {
    return this.e[1];
  }
  z() {
    return this.e[2];
  }

  /** Negation (unary -v). */
  negative() {
    return new Vec3(-this.e[0], -this.e[1], -this.e[2]);
  }

  /** Return a new Vec3 that is v * scalar. */
  multiplyScalar(t) {
    return new Vec3(this.e[0] * t, this.e[1] * t, this.e[2] * t);
  }

  /** Return a new Vec3 that is v + w. */
  add(w) {
    return new Vec3(this.e[0] + w.e[0], this.e[1] + w.e[1], this.e[2] + w.e[2]);
  }

  /** Return a new Vec3 that is v - w. */
  subtract(w) {
    return new Vec3(this.e[0] - w.e[0], this.e[1] - w.e[1], this.e[2] - w.e[2]);
  }

  /** Hadamard product (component-wise multiply). */
  multiply(w) {
    return new Vec3(this.e[0] * w.e[0], this.e[1] * w.e[1], this.e[2] * w.e[2]);
  }

  lengthSquared() {
    return this.e[0] * this.e[0] + this.e[1] * this.e[1] + this.e[2] * this.e[2];
  }

  length() {
    return Math.sqrt(this.lengthSquared());
  }

  /** True if all components are near zero. */
  nearZero() {
    const s = 1e-8;
    return Math.abs(this.e[0]) < s && Math.abs(this.e[1]) < s && Math.abs(this.e[2]) < s;
  }

  // Static utilities

  static dot(u, v) {
    return u.e[0] * v.e[0] + u.e[1] * v.e[1] + u.e[2] * v.e[2];
  }

  static cross(u, v) {
    return new Vec3(u.e[1] * v.e[2] - u.e[2] * v.e[1], u.e[2] * v.e[0] - u.e[0] * v.e[2], u.e[0] * v.e[1] - u.e[1] * v.e[0]);
  }

  static add(u, v) {
    return u.add(v);
  }

  static subtract(u, v) {
    return u.subtract(v);
  }

  static multiply(u, v) {
    return u.multiply(v);
  }

  static multiplyScalar(u, t) {
    return u.multiplyScalar(t);
  }

  static unitVector(v) {
    const len = v.length();
    return v.multiplyScalar(1 / len);
  }

  // Some random vector generators

  /** Random vector in [min,max]^3. */
  static randomVec(min = 0, max = 1) {
    return new Vec3(randomDoubleRange(min, max), randomDoubleRange(min, max), randomDoubleRange(min, max));
  }
}

/*************************************************************
 * Ray
 *************************************************************/
class Ray {
  constructor(origin, direction) {
    this.orig = origin; // Vec3
    this.dir = direction; // Vec3
  }

  origin() {
    return this.orig;
  }

  direction() {
    return this.dir;
  }

  at(t) {
    return this.orig.add(this.dir.multiplyScalar(t));
  }
}

/*************************************************************
 * Interval: A min and max, for valid t-range
 *************************************************************/
class Interval {
  constructor(minVal, maxVal) {
    this.min = minVal;
    this.max = maxVal;
  }

  contains(x) {
    return this.min <= x && x <= this.max;
  }

  surrounds(x) {
    return this.min < x && x < this.max;
  }
}
const EMPTY_INTERVAL = new Interval(+INF, -INF);
const UNIVERSE_INTERVAL = new Interval(-INF, +INF);

/*************************************************************
 * Hittable and HitRecord
 *************************************************************/
class HitRecord {
  constructor() {
    this.p = new Vec3(); // intersection point
    this.normal = new Vec3(); // surface normal
    this.mat = null; // material pointer
    this.t = 0; // ray param
    this.frontFace = true; // boolean
  }

  setFaceNormal(ray, outwardNormal) {
    const front = Vec3.dot(ray.direction(), outwardNormal) < 0;
    this.frontFace = front;
    this.normal = front ? outwardNormal : outwardNormal.negative();
  }
}

class Hittable {
  // Subclasses must implement:
  //    hit(ray, tInterval, rec) : bool
  hit(ray, tInterval, rec) {
    return false;
  }
}

/*************************************************************
 * Sphere
 *************************************************************/
class Sphere extends Hittable {
  constructor(center, radius, material) {
    super();
    this.center = center;
    this.radius = radius;
    this.mat = material; // a Material subclass
  }

  hit(ray, tInterval, rec) {
    const oc = this.center.subtract(ray.origin());
    const a = ray.direction().lengthSquared();
    const halfB = Vec3.dot(ray.direction(), oc);
    const c = oc.lengthSquared() - this.radius * this.radius;

    const discriminant = halfB * halfB - a * c;
    if (discriminant < 0) {
      return false;
    }
    const sqrtd = Math.sqrt(discriminant);

    // Find the nearest root in the acceptable range.
    let root = (halfB - sqrtd) / a;
    if (!tInterval.surrounds(root)) {
      root = (halfB + sqrtd) / a;
      if (!tInterval.surrounds(root)) {
        return false;
      }
    }

    rec.t = root;
    rec.p = ray.at(root);
    const outwardNormal = rec.p.subtract(this.center).multiplyScalar(1 / this.radius);
    rec.setFaceNormal(ray, outwardNormal);
    rec.mat = this.mat;

    return true;
  }
}

/*************************************************************
 * HittableList
 *************************************************************/
class HittableList extends Hittable {
  constructor() {
    super();
    this.objects = [];
  }

  clear() {
    this.objects = [];
  }

  add(obj) {
    this.objects.push(obj);
  }

  hit(ray, tInterval, rec) {
    let tempRec = new HitRecord();
    let hitAnything = false;
    let closestSoFar = tInterval.max;

    for (const obj of this.objects) {
      let subRec = new HitRecord();
      const newInterval = new Interval(tInterval.min, closestSoFar);
      if (obj.hit(ray, newInterval, subRec)) {
        hitAnything = true;
        closestSoFar = subRec.t;
        rec.p = subRec.p;
        rec.normal = subRec.normal;
        rec.mat = subRec.mat;
        rec.t = subRec.t;
        rec.frontFace = subRec.frontFace;
      }
    }
    return hitAnything;
  }
}

/*************************************************************
 * Material and Helpers
 *************************************************************/

// reflection of vector v about normal n
function reflect(v, n) {
  return v.subtract(n.multiplyScalar(2 * Vec3.dot(v, n)));
}

// refraction
function refract(uv, n, etaiOverEtat) {
  const cosTheta = Math.min(Vec3.dot(uv.negative(), n), 1.0);
  const rOutPerp = uv.add(n.multiplyScalar(cosTheta)).multiplyScalar(etaiOverEtat);
  const rOutParallel = n.multiplyScalar(-Math.sqrt(Math.abs(1.0 - rOutPerp.lengthSquared())));
  return rOutPerp.add(rOutParallel);
}

// Schlick approximation for reflectance
function schlick(cosine, refIdx) {
  let r0 = (1 - refIdx) / (1 + refIdx);
  r0 = r0 * r0;
  return r0 + (1 - r0) * Math.pow(1 - cosine, 5);
}

class Material {
  // scatter(ray_in, rec, attenuation, scattered) => bool
  scatter(ray_in, rec, attenuation, scattered) {
    return false;
  }
}

/** Lambertian diffuse material */
class Lambertian extends Material {
  constructor(albedo) {
    super();
    this.albedo = albedo; // Vec3 as color
  }

  scatter(ray_in, rec, attenuation, scattered) {
    let scatterDirection = rec.normal.add(randomUnitVector());
    // catch degenerate scatter direction
    if (scatterDirection.nearZero()) {
      scatterDirection = rec.normal;
    }
    scattered.orig = rec.p;
    scattered.dir = scatterDirection;
    attenuation.e[0] = this.albedo.x();
    attenuation.e[1] = this.albedo.y();
    attenuation.e[2] = this.albedo.z();
    return true;
  }
}

/** Metal (reflective) */
class Metal extends Material {
  constructor(albedo, fuzz) {
    super();
    this.albedo = albedo;
    this.fuzz = fuzz < 1 ? fuzz : 1;
  }

  scatter(ray_in, rec, attenuation, scattered) {
    const reflected = reflect(Vec3.unitVector(ray_in.direction()), rec.normal);
    const fuzzed = reflected.add(randomUnitVector().multiplyScalar(this.fuzz));
    scattered.orig = rec.p;
    scattered.dir = fuzzed;
    attenuation.e[0] = this.albedo.x();
    attenuation.e[1] = this.albedo.y();
    attenuation.e[2] = this.albedo.z();
    return Vec3.dot(scattered.dir, rec.normal) > 0;
  }
}

/** Dielectric (glass) with refraction */
class Dielectric extends Material {
  constructor(refractionIndex) {
    super();
    this.refractionIndex = refractionIndex;
  }

  scatter(ray_in, rec, attenuation, scattered) {
    attenuation.e[0] = 1.0;
    attenuation.e[1] = 1.0;
    attenuation.e[2] = 1.0;

    let etaiOverEtat = rec.frontFace ? 1.0 / this.refractionIndex : this.refractionIndex;

    const unitDirection = Vec3.unitVector(ray_in.direction());
    const cosTheta = Math.min(Vec3.dot(unitDirection.negative(), rec.normal), 1.0);
    const sinTheta = Math.sqrt(1.0 - cosTheta * cosTheta);

    let cannotRefract = etaiOverEtat * sinTheta > 1.0;
    let direction;
    if (cannotRefract) {
      // must reflect
      direction = reflect(unitDirection, rec.normal);
    } else {
      // Schlick for partial reflection
      if (schlick(cosTheta, etaiOverEtat) > randomDouble()) {
        direction = reflect(unitDirection, rec.normal);
      } else {
        direction = refract(unitDirection, rec.normal, etaiOverEtat);
      }
    }

    scattered.orig = rec.p;
    scattered.dir = direction;
    return true;
  }
}

/*************************************************************
 * Random Helpers for Diffuse, Hemispheres, Disk, etc.
 *************************************************************/

/** Return a random vector in the unit sphere, then normalized. */
function randomUnitVector() {
  while (true) {
    const p = new Vec3(randomDoubleRange(-1, 1), randomDoubleRange(-1, 1), randomDoubleRange(-1, 1));
    const lensq = p.lengthSquared();
    if (lensq > 1e-16 && lensq <= 1) {
      const factor = 1 / Math.sqrt(lensq);
      return p.multiplyScalar(factor);
    }
  }
}

/** Return a random point in a unit disk (z=0). */
function randomInUnitDisk() {
  while (true) {
    const p = new Vec3(randomDoubleRange(-1, 1), randomDoubleRange(-1, 1), 0);
    if (p.lengthSquared() < 1) {
      return p;
    }
  }
}

/*************************************************************
 * Camera
 *************************************************************/
class Camera {
  constructor() {
    this.aspectRatio = 16.0 / 9.0;
    this.imageWidth = 40;
    this.samplesPerPixel = 1;
    this.maxDepth = 5;

    this.vfov = 20; // vertical fov
    this.lookfrom = new Vec3(13, 2, 3);
    this.lookat = new Vec3(0, 0, 0);
    this.vup = new Vec3(0, 1, 0);

    this.defocusAngle = 0.0;
    this.focusDist = 10.0;

    // Internal (computed)
    this.imageHeight = 0;
    this.pixelSamplesScale = 0;
    this.center = new Vec3();
    this.pixel00Loc = new Vec3();
    this.pixelDeltaU = new Vec3();
    this.pixelDeltaV = new Vec3();
    this.u = new Vec3();
    this.v = new Vec3();
    this.w = new Vec3();
    this.defocusDiskU = new Vec3();
    this.defocusDiskV = new Vec3();
  }

  initialize() {
    // compute image height, scale factor
    this.imageHeight = Math.floor(this.imageWidth / this.aspectRatio);
    if (this.imageHeight < 1) {
      this.imageHeight = 1;
    }
    this.pixelSamplesScale = 1.0 / this.samplesPerPixel;

    this.center = this.lookfrom;

    // figure out the focus distance
    const focalLength = this.lookfrom.subtract(this.lookat).length();
    // if user gave an explicit "focusDist", use it. (We do that below.)

    // vertical field of view
    const theta = degreesToRadians(this.vfov);
    const h = Math.tan(theta / 2);

    const viewportHeight = 2 * h * this.focusDist;
    const viewportWidth = viewportHeight * (this.imageWidth / this.imageHeight);

    // camera orientation
    this.w = Vec3.unitVector(this.lookfrom.subtract(this.lookat));
    this.u = Vec3.unitVector(Vec3.cross(this.vup, this.w));
    this.v = Vec3.cross(this.w, this.u);

    // viewport edges
    const viewportU = this.u.multiplyScalar(viewportWidth);
    const viewportV = this.v.multiplyScalar(-viewportHeight);

    // pixel delta
    this.pixelDeltaU = viewportU.multiplyScalar(1.0 / this.imageWidth);
    this.pixelDeltaV = viewportV.multiplyScalar(1.0 / this.imageHeight);

    const viewportUpperLeft = this.center.subtract(this.w.multiplyScalar(this.focusDist)).subtract(viewportU.multiplyScalar(0.5)).subtract(viewportV.multiplyScalar(0.5));

    this.pixel00Loc = viewportUpperLeft.add(this.pixelDeltaU.add(this.pixelDeltaV).multiplyScalar(0.5));

    // lens radius
    const defocusRadius = this.focusDist * Math.tan(degreesToRadians(this.defocusAngle / 2));
    this.defocusDiskU = this.u.multiplyScalar(defocusRadius);
    this.defocusDiskV = this.v.multiplyScalar(defocusRadius);
  }

  getRay(i, j) {
    // pick random offset in pixel area
    const randX = randomDouble() - 0.5;
    const randY = randomDouble() - 0.5;
    const pixelSample = this.pixel00Loc.add(this.pixelDeltaU.multiplyScalar(i + 0.5 + randX)).add(this.pixelDeltaV.multiplyScalar(j + 0.5 + randY));

    let rayOrigin;
    if (this.defocusAngle <= 0) {
      rayOrigin = this.center;
    } else {
      // sample defocus disk
      const p = randomInUnitDisk();
      const lensSample = this.center.add(this.defocusDiskU.multiplyScalar(p.x())).add(this.defocusDiskV.multiplyScalar(p.y()));
      rayOrigin = lensSample;
    }

    const dir = pixelSample.subtract(rayOrigin);
    return new Ray(rayOrigin, dir);
  }

  /***********************************************************
   * Return the color for a ray
   ***********************************************************/
  rayColor(ray, depth, world) {
    if (depth <= 0) {
      return new Vec3(0, 0, 0);
    }

    const tInterval = new Interval(0.001, INF);
    const rec = new HitRecord();
    if (world.hit(ray, tInterval, rec)) {
      const scattered = new Ray(new Vec3(), new Vec3());
      const attenuation = new Vec3(0, 0, 0);
      if (rec.mat.scatter(ray, rec, attenuation, scattered)) {
        const bounceColor = this.rayColor(scattered, depth - 1, world);
        return attenuation.multiply(bounceColor);
      }
      return new Vec3(0, 0, 0);
    }

    // sky background
    const unitDir = Vec3.unitVector(ray.direction());
    const t = 0.5 * (unitDir.y() + 1.0);
    const white = new Vec3(1.0, 1.0, 1.0);
    const skyColor = new Vec3(0.5, 0.7, 1.0);
    return white.multiplyScalar(1.0 - t).add(skyColor.multiplyScalar(t));
  }

  /***********************************************************
   * Rendering
   ***********************************************************/
  render(world) {
    this.initialize();

    // Output PPM header
    console.log(`P3`);
    console.log(`${this.imageWidth} ${this.imageHeight}`);
    console.log(`255`);

    for (let j = this.imageHeight - 1; j >= 0; j--) {
      // progress indicator
      process.stderr.write(`\rScanlines remaining: ${j} `);

      for (let i = 0; i < this.imageWidth; i++) {
        let pixelColor = new Vec3(0, 0, 0);

        for (let s = 0; s < this.samplesPerPixel; s++) {
          const r = this.getRay(i, j);
          const sampleColor = this.rayColor(r, this.maxDepth, world);
          pixelColor = pixelColor.add(sampleColor);
        }

        // scale and gamma-correct
        pixelColor = pixelColor.multiplyScalar(this.pixelSamplesScale);

        // gamma = 2 => color^(1/2)
        let r = pixelColor.x();
        let g = pixelColor.y();
        let b = pixelColor.z();
        if (r < 0) r = 0;
        if (r > 1) r = 1;
        if (g < 0) g = 0;
        if (g > 1) g = 1;
        if (b < 0) b = 0;
        if (b > 1) b = 1;
        r = Math.sqrt(r);
        g = Math.sqrt(g);
        b = Math.sqrt(b);

        // convert to [0..255]
        let ir = Math.floor(256 * r);
        let ig = Math.floor(256 * g);
        let ib = Math.floor(256 * b);
        if (ir > 255) ir = 255;
        if (ig > 255) ig = 255;
        if (ib > 255) ib = 255;

        // console.log(`${ir} ${ig} ${ib}`);
      }
    }
    process.stderr.write(`\nDone.\n`);
  }
}

/*************************************************************
 * Main: Build the random-spheres scene, render via Camera
 *************************************************************/

function main() {
  // Create the world
  const world = new HittableList();

  // Ground
  const groundMaterial = new Lambertian(new Vec3(0.5, 0.5, 0.5));
  world.add(new Sphere(new Vec3(0, -1000, 0), 1000, groundMaterial));

  // Add many random small spheres
  for (let a = -11; a < 11; a++) {
    for (let b = -11; b < 11; b++) {
      const chooseMat = randomDouble();
      const center = new Vec3(a + 0.9 * randomDouble(), 0.2, b + 0.9 * randomDouble());

      if (center.subtract(new Vec3(4, 0.2, 0)).length() > 0.9) {
        let sphereMat;
        if (chooseMat < 0.8) {
          // diffuse
          const albedo = Vec3.randomVec().multiply(Vec3.randomVec());
          sphereMat = new Lambertian(albedo);
          world.add(new Sphere(center, 0.2, sphereMat));
        } else if (chooseMat < 0.95) {
          // metal
          const albedo = Vec3.randomVec(0.5, 1);
          const fuzz = randomDoubleRange(0, 0.5);
          sphereMat = new Metal(albedo, fuzz);
          world.add(new Sphere(center, 0.2, sphereMat));
        } else {
          // glass
          sphereMat = new Dielectric(1.5);
          world.add(new Sphere(center, 0.2, sphereMat));
        }
      }
    }
  }

  // Three big main spheres
  const material1 = new Dielectric(1.5);
  world.add(new Sphere(new Vec3(0, 1, 0), 1.0, material1));

  const material2 = new Lambertian(new Vec3(0.4, 0.2, 0.1));
  world.add(new Sphere(new Vec3(-4, 1, 0), 1.0, material2));

  const material3 = new Metal(new Vec3(0.7, 0.6, 0.5), 0.0);
  world.add(new Sphere(new Vec3(4, 1, 0), 1.0, material3));

  // Set up camera
  const cam = new Camera();
  cam.aspectRatio = 16.0 / 9.0;
  cam.imageWidth = 800; // reduce if too slow
  cam.samplesPerPixel = 1; // reduce if too slow
  cam.maxDepth = 50;

  cam.vfov = 20;
  cam.lookfrom = new Vec3(13, 2, 3);
  cam.lookat = new Vec3(0, 0, 0);
  cam.vup = new Vec3(0, 1, 0);

  // Depth-of-field parameters
  cam.defocusAngle = 0.6;
  cam.focusDist = 10.0;

  // Render!
  cam.render(world);
}

// Kick off the main function
main();
