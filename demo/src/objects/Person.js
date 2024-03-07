
export class Person extends Phaser.GameObjects.Sprite {
  body;

  // variables
   currentScene;
   //isActivated;
   speed;
   //dyingScoreValue;
   apartment;
   possibleLocations;
   currentLocation;

  constructor(params) {
    super(params.scene, params.x, params.y, params.texture, params.frame);

    // variables
    this.currentScene = params.scene;
    this.speed = params.speed;
    this.apartment = params.apartment;
    this.initSprite();
    this.currentScene.add.existing(this);
  }

  update() {
    this.handleAnimations();
  }

  initSprite() {
    // variables
    //this.isActivated = false;
    //this.isDying = false;

    // sprite
    //this.setOrigin(0, 0);
    //this.setFrame(0);

    // physics
    this.currentScene.physics.world.enable(this);
    this.body.setSize(32, 48);
  }

  handleAnimations() {
    // NOTE: Maybe revise for performance
    if (this.body.velocity.x > 0) {
      this.flipX = false;
    } else if (this.body.velocity.x < 0) {
      this.flipX = true;
    } 
    this.anims.play('rutIdle',true);
  }

  setPossibleLocations(locationList) {
    this.possibleLocations = locationList;
    this.setClosestLocation();
  }

  walkToLocation(endLocationKey) {

    // Begin by stopping any previous movement
    this.stopMovement();

    // Find current (closest) location
    this.setClosestLocation();
    var endLocationIndex = -1;

    //find location with corresponding key
    for (var i = 0; i < this.possibleLocations.length; i++) {
      console.log(this.possibleLocations[i].key);
      if (this.possibleLocations[i].key == endLocationKey) {
        endLocationIndex = i;
        break;
      }
    }
    // If key not found in possibleLocations list
    if (endLocationIndex == -1) throw new Error('Location key not found in list!');

    // list that includes all the locations that have to be passed
    var locationInPath = this.possibleLocations[endLocationIndex]; 

    var pathToWalk = []
    // while full path not discovered
    var tester = 0;
    while (locationInPath.key != this.currentLocation.key) {
      tester++;
      if(tester > 100) throw new Error('ajajaj');
      console.log(locationInPath.key);
      pathToWalk.push(locationInPath);

      // TODO: Select next neighbour to add (working backwards)

      //if on the right floor, move in x-direction of starting location
      var neighbours = locationInPath.getNeighbours();  

      if(locationInPath.floor == this.currentLocation.floor) {
        for (var i = 0; i < neighbours.length; i++) {
          if (this.currentLocation.x <= neighbours[i].x && neighbours[i].x <= locationInPath.x ||
              this.currentLocation.x >= neighbours[i].x && neighbours[i].x >= locationInPath.x) {
                // found next node to add
                //console.log("found next node to add: ", neighbours[i].key);
                //console.log(this.currentLocation.x ," ", neighbours[i].x ," ", locationInPath.x);
                locationInPath = neighbours[i];
                break;
              }
        }
      } else if (locationInPath.floor < this.currentLocation.floor) { // from lower floor (1) to higher floor (0)
          for (var i = 0; i < neighbours.length; i++) {
            if (neighbours[i].key == locationInPath.neighbourDownKey) {
              // found next node to add
              locationInPath = neighbours[i];
              break;
            }
          }
      } else { // locationInPath.floor > this.currentLocation.floor, from higher floor (1) to lower floor (0)
        for (var i = 0; i < neighbours.length; i++) { 
          if (neighbours[i].key === locationInPath.neighbourUpKey) {
            // found next node to add
            locationInPath = neighbours[i];
            break;
          }
        }
      }
    }

    // NOTE: walk to the current location (if not exactly on it)
    // This might be removed
    pathToWalk.push(this.currentLocation);
    this.walkPath(pathToWalk);
  }

  walkPath (points) {
    if(points.length > 0){
        const next = points.pop();
        console.log("current: ", this.currentLocation.key, ", next: ",next.key);
        if (next.key != this.currentLocation.key) {
          this.setZIndex({from: this.currentLocation, to: next})
        }
        this.currentLocation = next; // Note: this might be stupid
        this.moveToXY(next.x, next.y, 0, points);  
    } else {
        this.body.setVelocityX(0);
        this.body.setVelocityY(0);
    }
  }

  moveToXY (x, y, maxTime, points) {
    if (this.speed === undefined) { this.speed = 60; }
    if (maxTime === undefined) { maxTime = 0; }

    const angle = Math.atan2(y - this.y, x - this.x);
    const dx = this.x - x;
    const dy = this.y - y
    const time = Math.sqrt(dx * dx + dy * dy) / this.speed * 1000;
    this.body.setVelocityX((Math.cos(angle) * this.speed));
    this.body.setVelocityY((Math.sin(angle) * this.speed));
    this.MyTimedEvent = this.currentScene.time.addEvent({ 
                                                  delay: time, 
                                                  callback: this.walkPath, 
                                                  callbackScope: this, 
                                                  args: [ points ] });
  }

  setClosestLocation() {
    var minDistance = Number.MAX_SAFE_INTEGER;
    var closestLocationIndex = -1;
    for (var i = 0; i < this.possibleLocations.length; i++) {
      const dx = this.x - this.possibleLocations[i].x;
      const dy = this.y - this.possibleLocations[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        closestLocationIndex = i; 
        minDistance = distance;
      }
    }
    this.currentLocation = this.possibleLocations[closestLocationIndex];
  }

  setZIndex(params) {
    if (params.to.floor != params.from.floor) {
      // Moving between floors, bring character back
      this.setDepth(0);
    } else {
      this.setDepth(2);
    }
  }

  // Method to stop movement and interupt all scheduled movements
  stopMovement() {
    this.currentScene.time.removeEvent(this.MyTimedEvent);
    this.body.setVelocityX(0);
    this.body.setVelocityY(0);
  }
}