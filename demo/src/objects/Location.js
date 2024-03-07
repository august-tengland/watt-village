
// An extention of a simple (x,y) position, including neighbour-data for easier character pathing
export class Location extends Phaser.Math.Vector2 {
  
     neighbours;
     neighbourDownKey; // If you are at this location, and are going down in the apartment, go to following neighbour
     neighbourUpKey; // If you are at this location, and are going up in the apartment, go to following neighbour
     apartment; // Which apartment does the location belong to?
     floor; // Which floor, inside the specific apartment (or outside the building) is the point located at?
     key;
     x;
     y;
    constructor(params) {
      super(params.x, params.y);
  
      // variables
      this.key = params.key;
      this.x = params.x;
      this.y = params.y;
      this.apartment = params.apartment;
      this.floor = params.floor;
    }
    
    setNeighbours(neighbourList) {
      this.neighbours = neighbourList;
    }
    setNeighboursUpDown(params) {
      this.neighbourUpKey = params.up;
      this.neighbourDownKey = params.down;
    }
    getNeighbours() {
        return this.neighbours;
    }
  }