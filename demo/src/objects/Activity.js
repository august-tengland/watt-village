
// An extention of a simple (x,y) position, including neighbour-data for easier character pathing
export class Activity {

    key; 
    isActive;
    isIdle; // Does this activity require character precense or not?
    locationKey; // Each activity can only take place at one location
    minDuration;
    exitDuration; // If presence activity, how long does the character need to remain for the process to end?
   
    constructor(params) { 
     // variables
     this.isActive = false;
     this.key = params.key;
     this.isIdle = params.isIdle;
     this.locationKey = params.locationKey;
     this.minDuration = params.minDuration;
     this.exitDuration = typeof params.exitDuration !== "undefined" ? params.exitDuration : 0;

   }

 }