
// An extention of a simple (x,y) position, including neighbour-data for easier character pathing
export class Activity {

    key; 
    isActive;
    isIdle; // Does this activity require character precense or not?
    locationKey; // Each activity can only take place at one location
    minDuration;
    startDuration; // If presence activity, how long does the character need to remain for the process to start?
    exitDuration; // If presence activity, how long does the character need to remain for the process to end?
    device; // Device that this activity activates, NOTE: One action only affects one device (or zero)
   
    constructor(params) { 
     // variables
     this.isActive = false;
     this.key = params.key;
     this.isIdle = params.isIdle;
     this.locationKey = params.locationKey;
     this.minDuration = params.minDuration;
     this.exitDuration = typeof params.exitDuration !== "undefined" ? params.exitDuration : 0;
     this.startDuration = typeof params.startDuration !== "undefined" ? params.startDuration : 0;
     this.device = typeof params.device !== "undefined" ? params.device : null;
   }

   startActivity(){
    this.isActive = true;
    console.log("Activity started: ", this.key);
    if(this.device != null) {
      this.device.startDevice(this.startDuration);
    }
   }
   stopActivity(){
    this.isActive = false;
    console.log("Activity ended: ", this.key);
    if(this.device != null) {
      this.device.stopDevice();
    }
   }

 }