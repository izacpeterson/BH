class SquareMatrix {
  constructor(a, b, c, d) {
    this.vector = [
      [a, b],
      [c, d],
    ];
  }
}

let matrix = new SquareMatrix(3, 4, 2, 1);

console.log(matrix);
