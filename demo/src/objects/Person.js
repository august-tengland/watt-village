
export class Person extends Phaser.GameObjects.Sprite {
  body;

  // variables
   key;
   name;
   currentScene;
   speed;
   apartment;
   possibleLocations;
   currentLocation;
   // When schedule decides, doActivity() will set this to the coming activity and the character will start walking
   // When the character has reached the location, startActivity() will set "comingActivity" to "currentActivity" (if applicable)   
   comingActivity; 
   currentActivity; 
   schedule; // Map of time-activity pairs
   stopSchedule; // (Timestep, activity) map to keep track of when to stop idle activities
   
  constructor(params) {
    super(params.scene, params.x, params.y, params.texture, params.frame);

    // variables
    this.key = params.key;
    this.name = params.name;
    this.isControlledPerson = typeof params.isControlledPerson !== "undefined" ? params.isControlledPerson : false;
    this.currentScene = params.scene;
    this.speed = params.speed;
    this.playbackSpeed = 1;
    this.apartment = params.apartment;

    this.comingActivity = null;
    this.currentActivity = null; // Note: Set to sleeping maybe?
    this.schedule = null;
    this.stopSchedule = null;

    this.initSprite();
    this.currentScene.add.existing(this);
    this.handleAnimations();
  }

  // NOTE: This won't be called now, probably okay
  update() {
    this.handleAnimations();
  }

  updatePlaybackSpeed(speed) {
    this.speed = this.speed * (speed / this.playbackSpeed);
    this.playbackSpeed = speed; 
  }
 
  initSprite() {

    // sprite
    //this.setOrigin(0, 0);
    //this.setFrame(0);

    // physics
    this.currentScene.physics.world.enable(this);
    this.body.setSize(32, 48);
  }

  setSchedule(schedule) {
    ////console.log("calling setSchedule for person ", this.key);
    this.schedule = schedule;
    this.stopSchedule = new Map();
  }

  handleAnimations() {
    // NOTE: Maybe revise for performance
    if (this.body.velocity.x > 0) {
      this.flipX = false;
    } else if (this.body.velocity.x < 0) {
      this.flipX = true;
    } 
    if(this.currentActivity) {
      if (this.currentActivity.activityType === "book") {
        this.anims.play(this.name+'Reading',true);
        this.setOrigin(0.5,0.7);
        return;
      } else if (this.currentActivity.activityType === "tv") {
        this.setOrigin(0.5,0.7);
        return;
      } else if (this.currentActivity.activityType === "bed") {
        this.anims.stop();
        this.setFrame(12);
        if(this.apartment % 2 == 0) {
          this.angle = 90;
        } else {
          this.angle = 270;
        }
        return;
      }
    }
    this.anims.play(this.name+'Idle',true);
    this.angle = 0;
    this.setOrigin(0.5);
  }


  setPossibleLocations(locationList) {
    this.possibleLocations = locationList;
    this.setClosestLocation();
  }


  // **************************************************************************************
  // --------- DO ACTIVITY ---------------------------------------------------------------
  // **************************************************************************************

  doActivity(timestep, activity, duration) {
    if(activity.isIdleActivity) this.doIdleActivity(timestep, activity, duration);
    else this.doPresenceActivity(activity);
  }


  doIdleActivity(timestep, activity, duration) {
    //console.log(activity);
    activity.startActivity();
    //console.log(timestep + activity.minDuration);
    this.setMapValue(this.stopSchedule,(timestep + duration).toString(),activity);
    //this.stopSchedule.set((timestep + activity.minDuration).toString(),activity);
    //console.log(this.stopSchedule);
  }
  stopIdleActivity(activity) {
    //console.log("is this called?");
    activity.stopActivity();
  }

   doPresenceActivity(activity) {
    this.scene.events.emit('personStartedMoving', this.key);
    if (this.currentActivity != null) {
      var result = this.stopPresenceActivity();
      setTimeout(() => {
        this.comingActivity = activity; 
        ////console.log("walking to coming activity: " , this.comingActivity);
        this.walkToLocation(activity.locationKey);
      },this.currentActivity.exitDuration);
    } else {
      this.comingActivity = activity; 
      this.walkToLocation(activity.locationKey);
    };
  }

  startPresenceActivity() {
    this.currentActivity = this.comingActivity;
    this.comingActivity = null;
    this.currentActivity.startActivity();
    this.handleAnimations();
    //console.log("doing current activity: " , this.currentActivity); 
  }

  startPresenceActivityDefined(activity) {
    this.currentActivity = activity;
    this.comingActivity = null;
    this.currentActivity.startActivity();
    this.handleAnimations();
    //console.log("doing current activity: " , this.currentActivity); 
  }

  stopPresenceActivity() {
    ////console.log("finishing current activity: " , this.currentActivity); 
    this.currentActivity.stopActivity();
    // this.currentActivity.finish() (might take some time)
    setTimeout(() => {
      ////console.log("finished current activity: " , this.currentActivity); 
      this.currentActivity = null; 
    },this.currentActivity.exitDuration);
  }


  // **************************************************************************************
  // ----------- WALKING ------------------------------------------------------------------
  // **************************************************************************************
  
  // ASSUMPTION: Characters only walk to locations to complete an action that is there
  // i.e: If a character has reached a position, they are suppose to do their coming activity
  reachedPosition() {
    this.scene.events.emit('personStoppedMoving', this.key);
    this.startPresenceActivity();
    // EMIT START!
  }
  
  walkToLocation(endLocationKey) {

    // Begin by stopping any previous movement
    this.stopMovement();

    // Find current (closest) location
    this.setClosestLocation();
    var endLocationIndex = -1;
    //find location with corresponding key
    for (var i = 0; i < this.possibleLocations.length; i++) {
      if (this.possibleLocations[i].key === endLocationKey) {
        endLocationIndex = i;
        break;
      }
    }

    // If key not found in possibleLocations list
    ////console.log(this.possibleLocations);
    ////console.log(endLocationKey);
    if (endLocationIndex == -1) throw new Error('Location key not found in list!');

    // list that includes all the locations that have to be passed
    var pathToWalk = []
    var locationInPath = this.possibleLocations[endLocationIndex]; 

    // while full path not discovered
    var tester = 0;
    while (locationInPath.key != this.currentLocation.key) {
      tester++;
      ////console.log(pathToWalk);
      if(tester > 14) throw new Error(('Could not find path to location!'));
      //console.log(locationInPath.key);
      //console.log(this.currentLocation.key);

      pathToWalk.push(locationInPath);

      //if on the right floor, move in x-direction of starting location
      var neighbours = locationInPath.getNeighbours();  
      //console.log(neighbours);
      if(locationInPath.floor == this.currentLocation.floor) {
        //console.log("heeey");
        var neighboursSameFloor = neighbours.filter((location) => location.floor == locationInPath.floor );
        for (var i = 0; i < neighboursSameFloor.length; i++) {
          if (this.currentLocation.x <= neighboursSameFloor[i].x && neighboursSameFloor[i].x <= locationInPath.x ||
              this.currentLocation.x >= neighboursSameFloor[i].x && neighboursSameFloor[i].x >= locationInPath.x) {
                // found next node to add
                locationInPath = neighboursSameFloor[i];
                break;
              }
          
        }
        // Uh Oh, this is not great
        locationInPath = neighboursSameFloor[0];
        break;
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
        ////console.log("current: ", this.currentLocation.key, ", next: ",next.key);
        if (next.key != this.currentLocation.key) {
          this.setZIndex({from: this.currentLocation, to: next})
        }
        this.currentLocation = next; // Note: this might be stupid
        this.moveToXY(next.x, next.y, 0, points);  
    } else {
        this.body.setVelocityX(0);
        this.body.setVelocityY(0);
        this.reachedPosition();
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
    this.handleAnimations();
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
    if (params.to.floor == 2 || params.from.floor == 2) {
      this.setDepth(1);
    } else if (params.to.floor != params.from.floor) {
      // Moving between floors, bring character back
      this.setDepth(3);
    } else {
      this.setDepth(10);
    }
  }

  // Method to stop movement and interupt all scheduled movements
  stopMovement() {
    this.currentScene.time.removeEvent(this.MyTimedEvent);
    this.body.setVelocityX(0);
    this.body.setVelocityY(0);
  }
  setMapValue(map, key, value) {
    if (!map.has(key)) {
        map.set(key, [value]);
        return;
    }
    map.set(key, [value, ...map.get(key)]);
}
}