
import { Person } from '../objects/Person.js';
import { Location } from '../objects/Location.js';
import { Activity } from '../objects/Activity.js';
import { Device } from '../objects/Device.js';
import { Powerline } from '../objects/Powerline.js';

import { TotalEnergyHandler } from '../objects/TotalEnergyHandler.js';
import { IndividualEnergyHandler } from '../objects/IndividualEnergyHandler.js';
import { HouseSolarPanelHandler } from '../objects/HouseSolarPanelHandler.js';
import { ScheduleHandler } from '../objects/scheduleHandler.js';


export default class SimulationScene extends Phaser.Scene {

    constructor() {
        super({key: 'SimulationScene'});
    }
    init() {
        this.player = undefined;
        this.platforms = undefined;
        this.ground = undefined;

        this.cursors = undefined;    

        this.gameOver = false;
        this.scoreText = undefined;

        // LENGTH OF A DAY, i.e. simulation time
        // NOTE: Should always be a multiple of 24
        this.dayLength = 24*6; // 6 units per hour
        this.registry.values.dayLength = this.dayLength;
         
        // TIME UNIT CONVERSION FACTOR
        // How many in-game time units correspond to 1 hour "real time"?
        this.tucf = this.dayLength / 24;
        this.dayStartingHour = 3; // at which hour does the scene start/stop at?

        // Starting time for scene
        this.registry.values.time = this.dayStartingHour*this.tucf;

        // Controls playback speed of entire gameplay
        this.playbackSpeed = 8;
        
        // Controls the time interval for each in-game time unit
        this.updateSpeed = 2000;

        // Controls speed of animations
        this.speedyAnimations = true;
        this.setSpeedyAnimations(this.speedyAnimations);

        // Determines which schedules to follow 
        this.currentDay = this.registry.get("currentDay");

        this.usingGuide = this.registry.get('usingGuide');
        this.guideState = this.registry.get('guideState');

        console.log(this.currentDay);
        console.log(this.guideState);

        // Used to keep track of whether timer should be on or off (i.e. "speedup")
        this.numMovingCharacters = 0;

        // Base speed value for all characters
        this.characterSpeed = 300;

        // What is the optimal effect of the solar panels installed on the roof? (per house)
        this.solarPanelEffects = [null, null];
        if(this.currentDay == "day1") this.solarPanelEffects = [0, 0]; //kWh (per hour)
        else if (this.currentDay == "day2") this.solarPanelEffects = [5, 0];
        else if (this.currentDay == "day3") this.solarPanelEffects = [10, 0];
        else this.solarPanelEffects = [10, 14];

        this.powerlineUpdateFreq = 3;

        this.numUpdates = 0;

        var offsetsArray = this.setOffsets();
        this.baseOffset = offsetsArray[0];
        this.offsets = offsetsArray[1]; 

        this.scheduleHandler = new ScheduleHandler({scene: this, 
                                                    currentDayKey: this.currentDay, 
                                                    startTime: this.dayStartingHour * this.tucf, 
                                                    tucf: this.tucf});
    }
    
    create () {
        // *****************************************************************
        // TIMER & EVENT HANDLERS 
        // *****************************************************************
        
        //this.cameras.main.fadeIn(6000);
        this.gameTimer = this.time.addEvent({
            delay: this.updateSpeed/this.playbackSpeed,
            callback: this.updateTime,
            callbackScope: this,
            loop: true
        });
        this.isSpedup = false;
        this.gameTimer.paused = true; // We'll start it after finishing everything else
        
        this.microGameTimer = 0;
        
        this.events.on('personStartedMoving', this.handlePersonStartedMoving, this);

        this.events.on('personStoppedMoving', this.handlePersonStoppedMoving, this);

        this.events.emit('timeChanged',this.registry.values.time);

        // *****************************************************************
        // GAME OBJECTS
        // *****************************************************************

        this.gamezone = this.add.zone(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height);
    
        //  A simple background for our game
        this.sky = this.add.image(0, 0, 'sky');
        this.sky.setTint(0x169ac5,0x169ac5,0x9addf3,0x9addf3);

        Phaser.Display.Align.In.Center(this.sky,this.gamezone);
    
        //  The platforms group contains the ground and the 2 ledges we can jump on
        this.platforms = this.physics.add.staticGroup();
    
        //  Here we create the ground.
        this.ground = this.platforms.create(0, 0, 'ground').setScale(7).refreshBody();
        Phaser.Display.Align.In.BottomCenter(this.ground,this.gamezone);
    
        //  Backdrop for the houses
        this.houseSmallBackdrop = this.add.image(0, 0, 'houseSmallBackdrop');
        this.houseBigBackdrop = this.add.image(0, 0, 'houseBigBackdrop');
        //  House content
        this.houseSmall = this.add.image(0, 0, 'houseSmall');
        this.houseBig = this.add.image(0, 0, 'houseBig');

        // Foreground for the houses
        this.houseSmallForeground = this.add.image(0, 0, 'houseSmallForeground');
        this.houseBigForeground = this.add.image(0, 0, 'houseBigForeground');

        this.cars = this.createCars();

        this.houseSmallBackdrop.setDepth(2);
        this.houseBigBackdrop.setDepth(2);
        this.houseSmall.setDepth(4);
        this.houseBig.setDepth(4);
        this.houseSmallForeground.setDepth(15);
        this.houseBigForeground.setDepth(15);
        
        Phaser.Display.Align.To.TopCenter(this.houseSmallBackdrop,this.ground,-280,this.ground.height*2.3);
        Phaser.Display.Align.To.TopCenter(this.houseBigBackdrop,this.ground,420,this.ground.height*2.3);
        
        Phaser.Display.Align.In.Center(this.houseSmall,this.houseSmallBackdrop);
        Phaser.Display.Align.In.Center(this.houseBig,this.houseBigBackdrop);

        Phaser.Display.Align.In.Center(this.houseSmallForeground,this.houseSmallBackdrop);
        Phaser.Display.Align.In.Center(this.houseBigForeground,this.houseBigBackdrop);
        




        // ---- GAME & LOGIC OBJECTS -----------------------------------------

        this.people = this.add.group({
            /*classType: Person,*/
            runChildUpdate: true
        });

        // Create solar panels (that don't do anything)
        this.solarPanels = this.createSolarPanels();

        // create locations, (x,y) points specifying certain locations in/around the apartment
        this.locations = this.createLocations();

        // debug tool to visualize created locations, makes rectangles at given points
        //this.locationBlocks = this.createLocationVisuals();

        // Create devices, that are utilized during specific activities
        this.devices = this.createDevices();

        // Create activities, actions that characters can conduct at given places
        this.activities = this.createActivities();

        // Create people
        this.people = this.createPeople();

        // Create powerlines
        const powerlineResponseArray = this.createPowerlines();
        this.powerlines = powerlineResponseArray[0];
        this.powerlinesBackground = powerlineResponseArray[1];

        this.consumptionLabels = this.createConsumptionLabels();

        this.inverterLabels = this.createInverterLabels();

        // Create hiders
        this.hiders = this.createHiders();
        if(!this.usingGuide || !(this.guideState==="beforePlanner")) {
            // Create energy & solar handlers
            this.individualEnergyHandlers = this.createIndividualEnergyHandlers();
            //console.log(this.individualEnergyHandlers);

            this.houseSolarPanelHandlers = this.createHouseSolarPanelHandlers();
            //console.log(this.houseSolarPanelHandlers);

            this.totalEnergyHandler = this.createTotalEnergyHandler();
            //console.log(this.totalEnergyHandler);

            this.updatePlaybackSpeed();

            this.bindLocationsToPeople();

            this.assignSchedules();
        }

        // START
        if(!this.usingGuide || this.guideState==="inactive") {
            this.gameTimer.paused = false;
            this.events.emit('timeChanged',this.registry.values.time);
            this.events.emit('gamePausedChanged',this.gameTimer.paused,this.isSpedup);
            this.checkSchedules();
            this.updateHandlers();
            this.updateConsumptionLabels();
            this.updateInverterLabels();
        } else {
            if(this.guideState==="afterPlanner") {
                this.updateHandlers();
                this.updateConsumptionLabels();
                this.updateInverterLabels();
            }
            console.log("testing");
            this.scene.launch('GuideScene');
            this.scene.bringToTop('GuideScene');
            const guide = this.scene.get('GuideScene');
            guide.events.on('finished', this.runStart, this);
        }

        this.startCommunitySleeping();
        this.updateSkyTint(0);      
    }

    runStart() {
        this.gameTimer.paused = false;
        this.events.emit('timeChanged',this.registry.values.time);
        this.events.emit('gamePausedChanged',this.gameTimer.paused,this.isSpedup);
        this.checkSchedules();
        this.updateHandlers();
        this.updateConsumptionLabels();
        this.updateInverterLabels();
    }

    endDay() {
        this.gameTimer.paused = true;
        this.events.emit('gamePausedChanged',this.gameTimer.paused,this.isSpedup);
        this.scene.pause('SimulationScene');
        const totalStats = this.getTotalStats();
        this.registry.set("totalStats", totalStats);
        this.scene.launch('SummaryScene');
    }


    update () {

        this.numUpdates += 1;
        if(this.gameTimer.paused) this.microGameTimer = 0;
        else this.microGameTimer += 1;

        if(this.numUpdates % this.powerlineUpdateFreq == 0) {
            this.powerlines.forEach(powerline => powerline.handleAnimations());
            this.updateSkyTint(this.microGameTimer/(this.updateSpeed*0.06));
        }

        if (this.gameOver)
        {
            return;
        }
    
    }


// *********************************************************************
// ---- HELPER & LOGIC METHODS -----------------------------------------
// *********************************************************************

    setOffsets() {

        var baseOffset = {"x": 243, "y": 168 };

        var offsets = {
            "1": { "x": baseOffset['x'] + 0, "y": baseOffset['y'] },
            "2": { "x": baseOffset['x'] + 147, "y": baseOffset['y'] },
            "3": { "x": baseOffset['x'] + 0, "y": baseOffset['y'] + 277 },
            "4": { "x": baseOffset['x'] + 147, "y": baseOffset['y'] + 277 }
        }
        
        return [baseOffset, offsets];
    }

    updateTime() {
        this.registry.values.time += 1;
        this.microGameTimer = 0
        this.events.emit('timeChanged',this.registry.values.time);
        this.updateHandlers();
        this.checkSchedules();
        this.probeHandlers();
        this.updateConsumptionLabels();
        this.updateInverterLabels();
        this.updateSkyTint(0);
        this.checkSpeedup();
        if(this.registry.values.time >= this.dayStartingHour*this.tucf+this.dayLength) {
            this.endDay();
        };
    }

    checkSpeedup() {
        const consideredPeople = {
            day1: ['p1'],
            day2: ['p1'],
            day3: ['p1','p3'],
            day4: ['p1','p2','p3','p4']
        }
        var doSpeedup = true;
        const activities = [];
        for (var [key, person] of this.people) {
            if(consideredPeople[this.currentDay].includes(key) 
            && (person.currentActivity != null) 
            && (!["goToWork","bed"].includes(person.currentActivity.activityType))) {
                doSpeedup = false;
                activities.push(person.currentActivity.key);
            }
                
        }
        if(doSpeedup && !this.isSpedup) {
            console.log("NOTE!: Speedup = True");
            this.isSpedup = true;
            this.events.emit('gamePausedChanged',this.gameTimer.paused,this.isSpedup);
            this.gameTimer.reset({
                delay: this.updateSpeed/(6*this.playbackSpeed),
                callback: this.updateTime,
                callbackScope: this,
                loop: true
            });
        }
        else if (!doSpeedup && this.isSpedup){
            console.log("NOTE!: Speedup = False");
            this.events.emit('gamePausedChanged',this.gameTimer.paused,this.isSpedup);
            this.isSpedup = false;
            this.gameTimer.reset({
                delay: this.updateSpeed/this.playbackSpeed,
                callback: this.updateTime,
                callbackScope: this,
                loop: true
            });
        }
        //console.log(doSpeedup);
        //console.log(activities);
        //console.log(this.gameTimer);
        // this.gameTimer = this.time.addEvent({
        //     delay: this.updateSpeed/this.playbackSpeed,
        //     callback: this.updateTime,
        //     callbackScope: this,
        //     loop: true
        // });
    }

    checkSchedules() {
        const timeInt = this.registry.values.time;
        const timeString = timeInt.toString();
        for (var [key, person] of this.people) {

            if(person.schedule.has(timeString)) {
                const activityArray = person.schedule.get(timeString);
                activityArray.forEach(activityObject => {
                    console.log("person",key,"doing activity:",activityObject['activity'], "with duration:", activityObject['duration']);
                    person.doActivity(timeInt, activityObject['activity'], activityObject['duration']);
                })
            }
            if(person.stopSchedule.has(timeString)) {
                const activityArray = person.stopSchedule.get(timeString);
                activityArray.forEach(activity => {
                    person.stopIdleActivity(activity);
                })
            }
        }
    }

    handlePersonStartedMoving(personKey) {

        this.numMovingCharacters += 1;
        this.setSpeedyAnimations(false);
        this.gameTimer.paused = true;
        this.events.emit('gamePausedChanged',this.gameTimer.paused,this.isSpedup);

    }

    handlePersonStoppedMoving(personKey) {
        this.numMovingCharacters -= 1;
        if (this.numMovingCharacters == 0) {
            this.setSpeedyAnimations(true);
            this.gameTimer.paused = false;
            this.events.emit('gamePausedChanged',this.gameTimer.paused,this.isSpedup);        }
    }

    updatePlaybackSpeed() {
        this.anims.globalTimeScale = this.playbackSpeed;

        for (var [key, person] of this.people) {
            person.updatePlaybackSpeed(this.playbackSpeed);
        }
        for (var [key, activity] of this.activities) {
             activity.updatePlaybackSpeed(this.playbackSpeed);
        }
    }

    setSpeedyAnimations(isSpeedy) {
        this.speedyAnimations = isSpeedy;
        this.anims.globalTimeScale = isSpeedy ? 4 : 1;
    }

    updateHandlers() {

        for (var [key, individualEnergyHandler] of this.individualEnergyHandlers) {
            individualEnergyHandler.runUpdate(this.registry.values.time);
        }
        for (var [key, houseSolarPanelHandler] of this.houseSolarPanelHandlers) {
            houseSolarPanelHandler.runUpdate(this.registry.values.time);
        }

        this.totalEnergyHandler.runUpdate(this.registry.values.time);
    }
    
    probeHandlers() {

        for (var [key, individualEnergyHandler] of this.individualEnergyHandlers) {
            individualEnergyHandler.runUpdate(this.registry.values.time);
        }
        for (var [key, houseSolarPanelHandler] of this.houseSolarPanelHandlers) {
            houseSolarPanelHandler.runUpdate(this.registry.values.time);
        }

        this.totalEnergyHandler.runProbe(this.registry.values.time);
    }

    getTotalStats() {
        const totalStats = new Map();
        for (var [key, individualEnergyHandler] of this.individualEnergyHandlers) {
            totalStats[key] = individualEnergyHandler.getStats();
        }

        totalStats['total'] = this.totalEnergyHandler.getStats();
        return totalStats;
    }

    updateSkyTint(microAddOn) {

        function generateInbetweenColor(c1, c2, progression) {
            c1 = c1.toString(16);
            c2 = c2.toString(16);
            var c = "";
            for(var i = 0; i<3; i++) {
                var sub1 = c1.substring(2*i, 2+2*i);
                var sub2 = c2.substring(2*i, 2+2*i);
                var v1 = parseInt(sub1, 16);
                var v2 = parseInt(sub2, 16);
                var v = Math.floor(v1*(1-progression) + v2*progression);
                var sub = v.toString(16).toUpperCase();
                var padsub = ('0'+sub).slice(-2);
                c += padsub;
            }
            return parseInt(c,16);
        }

        const currentTime = this.registry.values.time + microAddOn;
        const topColors = [0x100020,0x5280a7,0x267aa5,0x169ac5];
        const bottomColors = [0x102040,0x4865b1,0xfaddc3,0x9addf3];
        const swaps = [5,6,7,9,17,19,20,21];
        for (var i = 0; i < swaps.length; i++) {
           if(swaps[i]*this.tucf > currentTime) {
                if(i == 0) {
                    this.sky.setTint(topColors[i],topColors[i],bottomColors[i],bottomColors[i]);
                } else {
                    const minTime = swaps[i-1];
                    const maxTime = swaps[i];
                    const progression = (currentTime-minTime*this.tucf) / (maxTime*this.tucf-minTime*this.tucf); 
                    const ci1 = Math.min(i-1, (swaps.length-1)-(i-1));
                    const ci2 = Math.min(i, (swaps.length-1)- i);
                    const topColor = generateInbetweenColor(topColors[ci1],topColors[ci2],progression);
                    const bottomColor = generateInbetweenColor(bottomColors[ci1],bottomColors[ci2],progression);
                    this.sky.setTint(topColor,topColor,bottomColor,bottomColor);
                }
            return;
           }
        }
        this.sky.setTint(topColors[0],topColors[0],bottomColors[0],bottomColors[0]); 
    }

    startCommunitySleeping() {
        const timeInt = this.registry.values.time;
        for (var [key, person] of this.people) {
            const sleepActivityKey = "a" + key.substring(1) + "bed";
            const sleepActivity = this.activities.get(sleepActivityKey);
            person.startPresenceActivityDefined(sleepActivity);    
        }
    }
    

// *********************************************************************
// ------- CREATION METHODS  -------------------------------------------
// *********************************************************************
 
createCars() {
    const carBasePositions = {x: 202,y: 935};
    const carOffsets = {
        0: {x: 0, y: 0},
        1: {x: 100, y: 0},
    }
    const cars = new Map();
    cars.set("car1", this.add.image(carBasePositions['x']+carOffsets[0]['x'],
                                    carBasePositions['y']+carOffsets[0]['y'],
                                    "car").setFrame(0));
    cars.set("car2", this.add.image(carBasePositions['x']+carOffsets[1]['x'],
                                    carBasePositions['y']+carOffsets[1]['y'],
                                    "car").setFrame(1));
    cars.get("car2").flipX = true;
    return cars;
}

createSolarPanels() {

    if(this.currentDay === "day1") return null; 

    var solarPanels = new Map();

    solarPanels.set('small1', this.add.image(0, 0, 'solarPanel'));
    Phaser.Display.Align.To.TopLeft(solarPanels.get('small1'),this.houseSmallBackdrop,0,0);
    
    if(this.currentDay === "day2") return solarPanels; 

    solarPanels.set('small2', this.add.image(0, 0, 'solarPanel'));
    Phaser.Display.Align.To.TopRight(solarPanels.get('small2'),this.houseSmallBackdrop,0,0);
    
    if(this.currentDay === "day3") return solarPanels; 

    solarPanels.set('big1', this.add.image(0, 0, 'solarPanel'));
    solarPanels.set('big2', this.add.image(0, 0, 'solarPanel'));
    solarPanels.set('big3', this.add.image(0, 0, 'solarPanel'));
    Phaser.Display.Align.To.TopLeft(solarPanels.get('big1'),this.houseBigBackdrop,0,0);
    Phaser.Display.Align.To.TopCenter(solarPanels.get('big2'),this.houseBigBackdrop,0,0);
    Phaser.Display.Align.To.TopRight(solarPanels.get('big3'),this.houseBigBackdrop,0,0);

    return solarPanels;

}

// ----- CREATE LOCATIONS -----------------------------------------------
// Method for creating all locations and binding neighbouring ones
// Locations are used by the characters to know where they are able to walk
// coding: "1XYZ", where X: apartment number, Y: floor number, Z: location number (horizontal)
    
createLocations() {
    // Create Locations
    const locations = new Map();

    // Initialize object with x & y coordinates for each position (in a single, small, apartment)
    const baseValuesSmall = {
        "0": {
            "0": { "x": 280, "y": 360 },
            "1": { "x": 375, "y": 360 },
            "2": { "x": 580, "y": 360 }
        },
        "1": {
            "0": { "x": 255, "y": 480 },
            "1": { "x": 390, "y": 480 },
            "2": { "x": 445, "y": 480 },
            "3": { "x": 520, "y": 480 },
            "4": { "x": 575, "y": 480 },
            "5": { "x": 660, "y": 480 }
        },
        "2": {
            "0": { "x": -270, "y": 770 },
            "1": { "x": 50, "y": 770 },
            "2": { "x": 660, "y": 770 },
            "3": { "x": 720, "y": 770 }
        }
    };

    // Initialize object with x & y coordinates for each position (in a single, big, apartment)
    const baseValuesBig = {
        "0": {
            "0": { "x": 790, "y": 360 },
            "1": { "x": 1161, "y": 360 },
            "2": { "x": 1250, "y": 360 } 
        },
        "1": {
            "0": { "x": 660, "y": 480 },
            "1": { "x": 750, "y": 480 },
            "2": { "x": 890, "y": 480 },
            "3": { "x": 1000, "y": 480 },
            "4": { "x": 1077, "y": 480 },
            "5": { "x": 1280, "y": 480 }
        },
        "2": {
            "0": { "x": -410, "y": 770 },
            "1": { "x": -100, "y": 770 },
            "2": { "x": 600, "y": 770 },
            "3": { "x": 660, "y": 770 }
        }
    };

    for (var apartment = 1; apartment <= 4; apartment++) {
        const baseValues = apartment % 2 == 0 ? baseValuesBig : baseValuesSmall;  
        for (const [floor, floorValues] of Object.entries(baseValues)) {
            for (const [locationEndKey, locationCoordinates] of Object.entries(floorValues)) {
                var locationKey = "l" + apartment + floor + locationEndKey;
                
                if (floor < 2) { // Include y-offset
                    locations.set(locationKey, new Location({key:locationKey, x: locationCoordinates['x']+this.offsets[apartment]["x"], y: locationCoordinates['y']+this.offsets[apartment]["y"], apartment: apartment, floor: floor}));                  
                } else { // Ignore y-offset (common ground level)
                    locations.set(locationKey, new Location({key:locationKey, x: locationCoordinates['x']+this.offsets[apartment]["x"], y: locationCoordinates['y']+this.baseOffset["y"], apartment: apartment, floor: floor}));
                  
                }
            }       
        }    
    }

    const neighboursSmall = {
        "0": {
            "0": ["01"],
            "1": ["00","12","02"],
            "2": ["01"]
        },
        "1": {
            "0": ["11"],
            "1": ["10","12"],
            "2": ["11","01","13"],
            "3": ["12","14"],
            "4": ["13","15"],
            "5": ["14","22"]
        },
        "2" :{
            "0": ["21"],
            "1": ["20", "23"],
            "2": ["15","23"],
            "3": ["21","22"]
        }
    };

    const neighboursUpDownSmall = {
        "0": {
            "0": { "up": null, "down": "01" },
            "1": { "up": null, "down": "12" },
            "2": { "up": null, "down": "01" }
        },
        "1": {
            "0": { "up": "11", "down": "11" },
            "1": { "up": "12", "down": "12" },
            "2": { "up": "01", "down": "13" },
            "3": { "up": "12", "down": "14" },
            "4": { "up": "13", "down": "15" },
            "5": { "up": "14", "down": "22" }
        },
        "2": {
            "0": { "up": "21", "down": null },
            "1": { "up": "23", "down": null },
            "2": { "up": "15", "down": null },
            "3": { "up": "22", "down": null }
        }
    };

    const neighboursBig = {
        "0": {
            "0": ["01"],
            "1": ["00","14","02"],
            "2": ["01"]
        },
        "1": {
            "0": ["23","11"],
            "1": ["10","12"],
            "2": ["11","13"],
            "3": ["12","14"],
            "4": ["13","01","15"],
            "5": ["14"]
        },
        "2" :{
            "0": ["21"],
            "1": ["20", "22"],
            "2": ["21","23"],
            "3": ["22","10"]
        }
    };

    const neighboursUpDownBig = {
        "0": {
            "0": { "up": null, "down": "01" },
            "1": { "up": null, "down": "14" },
            "2": { "up": null, "down": "01" }
        },
        "1": {
            "0": { "up": "11", "down": "23" },
            "1": { "up": "12", "down": "10" },
            "2": { "up": "13", "down": "11" },
            "3": { "up": "14", "down": "12" },
            "4": { "up": "01", "down": "13" },
            "5": { "up": "14", "down": "14" },
        },
        "2": {
            "0": { "up": "21", "down": null },
            "1": { "up": "22", "down": null },
            "2": { "up": "23", "down": null },
            "3": { "up": "10", "down": null }
        }
    };


    for (var apartment = 1; apartment <= 4; apartment++) {
        const locationSuffix = "l" + apartment;
        const neighbours = apartment % 2 == 0 ? neighboursBig : neighboursSmall;  
        const neighboursUpDown = apartment % 2 == 0 ? neighboursUpDownBig : neighboursUpDownSmall;  
        for (const [floor, floorValues] of Object.entries(neighbours)) {
            for (const [locationEndKey, neighbourPrefixList] of Object.entries(floorValues)) {
                const neighbourList = [];
                const neighbourUpDownObject = {};
                const locationKey = locationSuffix + floor + locationEndKey;

                neighbourPrefixList.forEach((neighbourPrefix) => {
                    neighbourList.push(locations.get(locationSuffix + neighbourPrefix));
                });
                locations.get(locationKey).setNeighbours(neighbourList);

                for (const [direction, neighbourPrefix] of Object.entries(neighboursUpDown[floor][locationEndKey])) {
                    if (neighbourPrefix == null) neighbourUpDownObject[direction] = null;
                    else neighbourUpDownObject[direction] = locationSuffix + neighbourPrefix;
                }
                ////console.log("current location:", locationKey);
                ////console.log("neighbour list:", neighbourList);
                ////console.log("neighbours up & down:", neighbourUpDownObject);
                locations.get(locationKey).setNeighboursUpDown(neighbourUpDownObject);
            }       
        }    
    }
    return locations;
}
// Method to generated small rectangles to visualize the position of each position
createLocationVisuals() {
    const locationBlocks = new Map();

    for(var [key, location] of this.locations) {
        locationBlocks.set(key, this.add.rectangle(location.x,location.y,4,4,"0xff0000"));
        locationBlocks.get(key).setDepth(20);
    }
}



// ----- CREATE DEVICES -----------------------------------------------

createDevices() {
    // Create Devices
    const devices = new Map();

    const basePositionsSmall = {
        "stove": { "x": 502, "y": 480 },
        "fridge": { "x": 596, "y": 465 },
        "washingMachine": { "x": 523, "y": 371 },
        "dishwasher": { "x": 536, "y": 489 },
        "bed": { "x": 250, "y": 478 },
        "carCharger": { "x": -1, "y": 772 },
        "tv": { "x": 212, "y": 351 }
    }

    const basePositionsBig = {
        "stove": { "x": 885, "y": 480 },
        "fridge": { "x": 736, "y": 465 },
        "washingMachine": { "x": 853, "y": 371 },
        "dishwasher": { "x": 825, "y": 489 },
        "bed": { "x": 1280, "y": 478 },
        "carCharger": { "x": -127, "y": 772 },
        "tv": { "x": 1322, "y": 351 }
    }

    const apartmentDeviceInfo = {
        "stove": {
            texture: 'stove',
            powerConsumption: 1.0/this.tucf,
            isIdleConsuming: false,
            animationKeys: {
                idle: 'stoveIdle',
                active: 'stoveActive'
            },
            repeatAnimation: true
        },
        "fridge": {
            texture: 'fridge',
            powerConsumption: 0.05/this.tucf, // kHw (per hour), = 1kWh / day
            isIdleConsuming: true,
            animationKeys: {
                idle: 'fridgeIdle',
                active: 'fridgeActive'
            },
            repeatAnimation: false
        },
        "washingMachine": {
            texture: 'washingMachine',
            powerConsumption: 1.0/this.tucf, // kHw (per hour), = 1kWh / day
            isIdleConsuming: false,
            animationKeys: {
                active: 'washingMachineActive'
            },
            repeatAnimation: true
        },
        "dishwasher": {
            texture: 'dishWasher',
            powerConsumption: 1.0/this.tucf, // kHw (per hour), = 1kWh / day
            isIdleConsuming: false,
            animationKeys: {
                active: 'dishWasherActive'
            },
            repeatAnimation: true
        },
        "bed": {
            texture: 'bed',
            powerConsumption: 0, 
            isIdleConsuming: false,
            animationKeys: {
                active: 'bedActive'
            },
            repeatAnimation: false
        },
        "carCharger": {
            texture: 'carCharger',
            powerConsumption: 11.0/this.tucf, 
            isIdleConsuming: false,
            animationKeys: {
                active: 'carChargerActive'
            },
            repeatAnimation: true,
            disable: [3,4] // The following apartments will not have access to the device
        },
        "tv": {
            texture: 'tv',
            powerConsumption: 0.15/this.tucf, 
            isIdleConsuming: false,
            animationKeys: {
                active: 'tvActive'
            },
            repeatAnimation: true
        }
    }

    for (var apartment = 1; apartment <= 4; apartment++) {
        const deviceSuffix = "d" + apartment;
        const basePositions = apartment % 2 == 0 ? basePositionsBig : basePositionsSmall;  
        for (const [deviceName, DeviceValues] of Object.entries(apartmentDeviceInfo)) {
            if(DeviceValues['disable'] != null && DeviceValues['disable'].includes(apartment)) { //&& DeviceValues['disable'].contains(apartment)
            } else {
                if(this.usingGuide && this.guideState === "beforePlanner") DeviceValues['isIdleConsuming'] = false;
                const deviceKey = deviceSuffix + deviceName;
                const positions = {
                    x: basePositions[deviceName]['x'] + this.offsets[apartment]['x'],
                    y: basePositions[deviceName]['y'] + this.offsets[apartment]['y']
                }
                var lightning = this.add.sprite(positions['x'],positions['y'], "lightning");
                lightning.setDepth(8);
    
                devices.set(deviceKey, new Device({key: deviceKey, 
                                                   scene: this, 
                                                   apartment: apartment, 
                                                   ...positions, 
                                                   ...DeviceValues,
                                                   lightning}));
            }
            
        }
    }

    for(var [key, device] of devices) {
        device.setDepth(5);
        if(device.type === 'bed') {
            device.setDepth(40);
        }
    }

    
    return devices;
}

// ----- CREATE ACTIVITIES -----------------------------------------------
    createActivities() {
        const activities = new Map();

        const activityInfo = {
            "fridge": {
                isIdleActivity: false,
                minDuration: null,
                startDuration: 300,
                exitDuration: 300,
                deviceType: "fridge" 
            },
            "stove": {
                isIdleActivity: false,
                minDuration: null,
                startDuration: 300,
                exitDuration: 300,
                deviceType: "stove" 
            },
            "dinnerTable": {
                isIdleActivity: false,
                minDuration: null,
                startDuration: 300,
                exitDuration: 300,
                deviceType: null 
            },
            "dishwasher": {
                isIdleActivity: true,
                minDuration: 1*this.tucf,
                startDuration: 300,
                exitDuration: 300,
                deviceType: "dishwasher" 
            },
            "washingMachine": {
                isIdleActivity: true,
                minDuration: 1*this.tucf,
                startDuration: 300,
                exitDuration: 300,
                deviceType: "washingMachine"
            },
            "goToWork": {
                isIdleActivity: false,
                minDuration: null,
                startDuration: 0,
                exitDuration: 0,
                deviceType: null 
            },
            "bathroom": {
                isIdleActivity: false,
                minDuration: null,
                startDuration: 0,
                exitDuration: 0,
                deviceType: null 
            },
            "couch": {
                isIdleActivity: false,
                minDuration: null,
                startDuration: 0,
                exitDuration: 0,
                deviceType: null 
            },
            "tv": {
                isIdleActivity: false,
                minDuration: null,
                startDuration: 0,
                exitDuration: 0,
                deviceType: "tv" 
            },
            "book": {
                isIdleActivity: false,
                minDuration: null,
                startDuration: 0,
                exitDuration: 0,
                deviceType: null 
            },
            "bed": {
                isIdleActivity: false,
                minDuration: null,
                startDuration: 0,
                exitDuration: 0,
                deviceType: "bed" 
            },
            "carCharge": {
                isIdleActivity: true,
                minDuration: 6*this.tucf,
                startDuration: 0,
                exitDuration: 0,
                deviceType: "carCharger",
                disable: [3,4] // The following apartments will not have access to the activity 
            }
        }

        const baseLocationSuffixSmall = {
            "stove": "13", 
            "fridge": "14",
            "dinnerTable": "11",
            "dishwasher": "11",
            "washingMachine": "02",
            "goToWork": "20",
            "bathroom": "02",
            "bed": "10",
            "couch": "00",
            "tv": "00",
            "book": "00",
            "carCharge": "21",
        }
    
        const baseLocationSuffixBig = {
            "stove": "12", 
            "fridge": "11",
            "dinnerTable": "13",
            "dishwasher": "12",
            "washingMachine": "02",
            "goToWork": "20",
            "bathroom": "00",
            "bed": "15",
            "couch": "02",
            "tv": "02",
            "book": "02",
            "carCharge": "21"
        }

        for (var apartment = 1; apartment <= 4; apartment++) {
            const activitySuffix = "a" + apartment;
            const baseLocationSuffix = apartment % 2 == 0 ? baseLocationSuffixBig : baseLocationSuffixSmall;  
            for (const [activityName, activityValues] of Object.entries(activityInfo)) {
                if(activityName in baseLocationSuffix) {
                    if(activityInfo['disable'] != null && activityInfo['disable'].includes(apartment)) break;
                    else { //&& DeviceValues['disable'].contains(apartment)
                        const activityKey = activitySuffix + activityName;
                        const device = activityValues.deviceType ? this.devices.get("d" + apartment + activityValues.deviceType) : null; 
                        const locationKey = "l" + apartment + baseLocationSuffix[activityName];
                        activities.set(activityKey, new Activity({key: activityKey, 
                                                                activityType: activityName,
                                                                scene: this, 
                                                                apartment: apartment, 
                                                                device: device, 
                                                                locationKey: locationKey, 
                                                                ...activityValues}));    
                    }
                }
            }
        }

        return activities;
    }

// ------- CREATE PEOPLE -------------------------------------------------

    createPeople() {

        const people = new Map();

        // APARTMENT 1 

        people.set("p1", new Person({
            key: "p1",
            name: "rut",
            isControlledPerson: true,
            scene: this,
            x: this.locations.get('l110').x-10,
            y: this.locations.get('l110').y,
            apartment: 1,
            speed: this.characterSpeed,
            texture: 'rut'}));

        // APARTMENT 2 

        people.set("p2", new Person({
            key: "p2",
            name: "maria",
            scene: this,
            x: this.locations.get('l215').x,
            y: this.locations.get('l215').y,
            apartment: 2,
            speed: this.characterSpeed,
            texture: 'maria'}));


        // APARTMENT 3 

        people.set("p3", new Person({
            key: "p3",
            name: "peter",
            scene: this,
            x: this.locations.get('l310').x-10,
            y: this.locations.get('l310').y,
            apartment: 3,
            speed: this.characterSpeed,
            texture: 'peter'}));

        // APARTMENT 4

        people.set("p4", new Person({
            key: "p4",
            name: "ravi",
            scene: this,
            x: this.locations.get('l415').x,
            y: this.locations.get('l415').y,
            apartment: 4,
            speed: this.characterSpeed,
            texture: 'ravi'}));

        for(var [key, person] of people) {
            person.setDepth(10);
        }
        
        return people;
    }

    // Method to assign each person the possible locations that they can be present at
    bindLocationsToPeople() {
        for (var [key, person] of this.people) {
            var locationsForPerson = [];
            for (var [key, location] of this.locations) {
                if (person.apartment == location.apartment) {
                    locationsForPerson.push(location);
                } 
            }
            person.setPossibleLocations(locationsForPerson);
            ////console.log("possible locations for person ", person.key, ": ", locationsForPerson);
        };
    }

// -------- ASSIGN SCHEDULES -------------------------------------------

    assignSchedules() {

        const activityTracker = this.registry.get("activityTracker");
        
        for (var [key, person] of this.people) {
            var schedule = null;
            if(person.isControlledPerson) {
                var timestep = (8*this.tucf).toString();
                schedule = this.scheduleHandler.createControlledSchedule(person.key, activityTracker, this.activities);
            } else {
                schedule = this.scheduleHandler.getSchedule(person.key, this.activities);
            }
            console.log(key,schedule);
            person.setSchedule(schedule);
        
        };
    }

// ---- CREATE CONSUMPTION LABELS -----------------------------------

    createConsumptionLabels() {
        const consumptionLabels = new Map();
        const labelPostitions = {
            1: {x: 590, y: 673},
            2: {x: 1352, y: 673},
            3: {x: 590, y: 951},
            4: {x: 1352, y: 951}
        }
        for (var apartment = 1; apartment <= 4; apartment++) {
            
            this.add.rectangle(
                labelPostitions[apartment]['x']-2,
                labelPostitions[apartment]['y'],
                62, 16, "0x523900").setOrigin(0).setDepth(30);

            consumptionLabels.set(apartment, this.addText(
                                        labelPostitions[apartment]['x'],
                                        labelPostitions[apartment]['y'],
                                        this.setConsumptionLabelText(0),
                                        12).setDepth(35));
        }

        return consumptionLabels;
    }

    createInverterLabels() {
        const inverterLabels = new Map();
        const inverterBaseValues = {x: 942, y: 960, width: 65, height: 110};
        const labelData = {
            1: {x: 4, y: 5, isValue: false, text: "Produce", color: "#aa9966"},
            2: {x: 4, y: 20, isValue: true, text: "0", color: "#ffffff"},
            3: {x: 4, y: 40, isValue: false, text: "Buy", color: "#aa9966"},
            4: {x: 4, y: 55, isValue: true, text: "0", color: "#ffffff"},
            5: {x: 4, y: 75, isValue: false, text: "Sell", color: "#aa9966"},
            6: {x: 4, y: 90, isValue: true, text: "0", color: "#ffffff"}
        }

        this.add.rectangle(
            inverterBaseValues['x'],
            inverterBaseValues['y'],
            inverterBaseValues['width'],
            inverterBaseValues['height'],
            "0x443933").setOrigin(0).setDepth(3);

        for (var label = 1; label <= 6; label++) {
            const textString = labelData[label]['isValue'] ? 
                                    this.setConsumptionLabelText(labelData[label]['text']) : 
                                    labelData[label]['text'];

            inverterLabels.set(label, this.addText(
                                        inverterBaseValues['x']+labelData[label]['x'],
                                        inverterBaseValues['y']+labelData[label]['y'],
                                        textString,
                                        12,
                                        labelData[label]['color']).setDepth(5));
        }

        return inverterLabels;
    }

    updateConsumptionLabels() {
        this.individualEnergyHandlers.forEach((handler) => {
            handler.updateCurrentConsumption();
            this.consumptionLabels.get(handler.apartment).setText(this.setConsumptionLabelText(handler.currentConsumption)); 
        });
    }

    updateInverterLabels() {
        this.inverterLabels.get(2).setText(this.setConsumptionLabelText(this.totalEnergyHandler.currentTotalSolarProduction)); 
        this.inverterLabels.get(4).setText(this.setConsumptionLabelText(this.totalEnergyHandler.currentTotalBuying)); 
        this.inverterLabels.get(6).setText(this.setConsumptionLabelText(this.totalEnergyHandler.currentTotalSelling)); 
    }

    setConsumptionLabelText(effect) {
        effect = Math.min(99.99,effect*this.tucf);
        var effectLabel = effect.toFixed(2).toString().padStart(5, '0');
        effectLabel += " kWh";
        return effectLabel;
    }


    addText(x, y, value, size = 32, color = "#ffffff", fontStyle = 'bold') {
        return this.add.text(x, y, value, { fontFamily: 'Arial', fontStyle: fontStyle, fontSize: `${size}px`, fill: color });
      }

// ----- CREATE ENERGY HANDLERS --------------------------------------

    createIndividualEnergyHandlers() {

        const individualEnergyHandlers = new Map();
        const isActive = {
            "day1": {1: true, 2: false, 3: false, 4: false},
            "day2": {1: true, 2: false, 3: false, 4: false},
            "day3": {1: true, 2: false, 3: true, 4: false},
            "day4": {1: true, 2: true, 3: true, 4: true}
        }

        for (var apartment = 1; apartment <= 4; apartment++) {
            const iehKey = "ieh" + apartment;
            const house = apartment % 2 == 0 ? 1 : 0;
            individualEnergyHandlers.set(iehKey, new IndividualEnergyHandler({
                scene: this, 
                key: iehKey,
                apartment: apartment,
                house: house,
                devices: new Map([...this.devices].filter(([k, v]) => v.apartment == apartment )), 
                time: this.registry.values.time,
                dayLength: this.dayLength,
                currentDayKey: this.currentDay,
                isActive: isActive[this.currentDay][apartment],
                baseline: this.registry.get("baseline")}));
        }
        
        return individualEnergyHandlers;
    }

    createHouseSolarPanelHandlers() {

        const isActive = {
            "day1": {0: false, 1: false},
            "day2": {0: true, 1: false},
            "day3": {0: true, 1: false},
            "day4": {0: true, 1: true}
        }

        const houseSolarPanelHandlers = new Map();

        for (var house = 0; house <= 1; house++) {
            const hsphKey = "hsph" + house;
            houseSolarPanelHandlers.set(hsphKey, new HouseSolarPanelHandler({
                scene: this, 
                key: hsphKey,
                house: house,
                time: this.registry.values.time,
                dayLength: this.dayLength,
                solarPanelEffect: this.solarPanelEffects[house]/this.tucf,
                isActive: isActive[this.currentDay][house],
                currentDayKey: this.currentDay}));

        }
        return houseSolarPanelHandlers;
    }

    createTotalEnergyHandler() {
        
        // Create energy handler, that aggregates energy consumption and production to calculate costs
        var totalEnergyHandler = new TotalEnergyHandler({scene: this, 
            devices: this.devices, 
            time: this.registry.values.time,
            dayLength: this.dayLength,
            individualEnergyHandlers: this.individualEnergyHandlers,
            houseSolarPanelHandlers: this.houseSolarPanelHandlers,
            powerlines: this.powerlines,
            currentDayKey: this.currentDay,
            baseline: this.registry.get("baseline")});

        return totalEnergyHandler;
    }

    // ---- CREATE HIDERS -----------------------------------------
    createHiders() {

        const hiders = new Map();
        if (this.currentDay !== "day4") {
            hiders.set("hh1",this.add.image(1048,410,"houseBigHider").setOrigin(0).setDepth(100));
            if(this.currentDay !== "day3") {
                hiders.set("ha3",this.add.image(435,692,"apartmentSmallHider").setOrigin(0).setDepth(100));
            }
        } 
        return hiders;
    }
    // ---- CREATE POWERLINES ---------------------------------------

    createPowerlines() {

        const powerlines = new Map();
        const powerlinesBackground = new Map();

        const powerlineBaseData = {
            width: 5,
            isActive: true,
            backgroundColor: "0x523900",
            backgroundPadding: 1,
            baseSpeed: 0.5
        }
        const powerlineData = {
            plh0sp1: {
                x: 527, y: 385,
                length: 20,
                apartment: 0, house: 1, 
                orientation: 1,
                type: "solar",
                speed: 1
            },
            plh0sp2: {
                x: 828, y: 385,
                length: 20,
                apartment: 3, house: 1, 
                orientation: 1,
                type: "solar",
                speed: 1
            },
            plh0r1: {
                x: 527, y: 405,
                length: 305,
                apartment: 0, house: 1, 
                orientation: 0,
                type: "solar",
                speed: 1
            },
            plh0r2: {
                x: 832, y: 405,
                length: 85,
                apartment: 0, house: 1, 
                orientation: 0,
                type: "solar",
                speed: 2
            },
            plh0re1: {
                x: 917, y: 405,
                length: 580,
                apartment: 0, house: 1, 
                orientation: 1,
                type: "solar",
                speed: 2
            },
            plh0re2: {
                x: 917, y: 985,
                length: 25,
                apartment: 0, house: 1, 
                orientation: 0,
                type: "solar",
                speed: 2
            },
            plh0me1: {
                x: 900, y: 1000,
                length: 45,
                apartment: 0, house: 1, 
                orientation: 2,
                type: "mixed",
                speed: 4
            },
            plh0me2: {
                x: 895, y: 960,
                length: 45,
                apartment: 0, house: 1, 
                orientation: 3,
                type: "mixed",
                speed: 4
            },
            plh0a1s1: {
                x: 895, y: 685,
                length: 275,
                apartment: 1, house: 1, 
                orientation: 3,
                type: "mixed",
                speed: 2
            },
            plh0a1s2: {
                x: 650, y: 680,
                length: 250,
                apartment: 1, house: 1, 
                orientation: 2,
                type: "mixed",
                speed: 2
            },
            plh0a3s1: {
                x: 650, y: 960,
                length: 250,
                apartment: 3, house: 1, 
                orientation: 2,
                type: "mixed",
                speed: 2
            },
            plh1sp1: {
                x: 1120, y: 385,
                length: 20,
                apartment: 0, house: 2, 
                orientation: 1,
                type: "solar",
                speed: 0.8
            },
            plh1sp2: {
                x: 1378, y: 385,
                length: 20,
                apartment: 0, house: 2, 
                orientation: 1,
                type: "solar",
                speed: 0.8
            },
            plh1sp3: {
                x: 1636, y: 385,
                length: 20,
                apartment: 0, house: 2, 
                orientation: 1,
                type: "solar",
                speed: 0.8
            },
            plh1r1: {
                x: 1040, y: 405,
                length: 85,
                apartment: 0, house: 2, 
                orientation: 2,
                type: "solar",
                speed: 2.4
            },
            plh1r2: {
                x: 1120, y: 405,
                length: 263,
                apartment: 0, house: 2, 
                orientation: 2,
                type: "solar",
                speed: 1.6
            },
            plh1r3: {
                x: 1378, y: 405,
                length: 263,
                apartment: 0, house: 2, 
                orientation: 2,
                type: "solar",
                speed: 0.8
            },
            plh1re1: {
                x: 1035, y: 405,
                length: 580,
                apartment: 0, house: 2, 
                orientation: 1,
                type: "solar",
                speed: 2.4
            },
            plh1re2: {
                x: 1005, y: 985,
                length: 35,
                apartment: 0, house: 2, 
                orientation: 2,
                type: "solar",
                speed: 2.4
            },
            plh1me1: {
                x: 1005, y: 1000,
                length: 50,
                apartment: 0, house: 2, 
                orientation: 0,
                type: "mixed",
                speed: 4
            },
            plh1me2: {
                x: 1050, y: 960,
                length: 45,
                apartment: 0, house: 2, 
                orientation: 3,
                type: "mixed",
                speed: 4
            },
            plh1a2s1: {
                x: 1050, y: 685,
                length: 275,
                apartment: 2, house: 2, 
                orientation: 3,
                type: "mixed",
                speed: 2
            },
            plh1a2s2: {
                x: 1050, y: 680,
                length: 300,
                apartment: 2, house: 2, 
                orientation: 0,
                type: "mixed",
                speed: 2
            },
            plh1a4s1: {
                x: 1050, y: 960,
                length: 300,
                apartment: 4, house: 2, 
                orientation: 0,
                type: "mixed",
                speed: 2
            },
            plcc1: {
                x: 255, y: 1015,
                length: 690,
                apartment: 0, house: 0,
                orientation: 2,
                type: "mixed",
                speed: 2
            },
            plcc2: {
                x: 250, y: 930,
                length: 90,
                apartment: 0, house: 0,
                orientation: 3,
                type: "mixed",
                speed: 2
            },
            plbe: {
                x: 0, y: 1035,
                length: 945,
                apartment: 0, house: 0,
                orientation: 0,
                type: "bought",
                speed: 4
            },
            plsre: {
                x: 0, y: 1045,
                length: 945,
                apartment: 0, house: 0,
                orientation: 2,
                type: "solarSell",
                speed: 4
            },

        }

        const allowedPowerlines = {
            day1: {
                apartment: [0,1],
                house: [0,1],
                type: ['bought','mixed']
            },
            day2: {
                apartment: [0,1],
                house: [0,1],
            },
            day3: {
                apartment: [0,1,3],
                house: [0,1]
            },
            day4: {
                apartment: [0,1,2,3,4],
                house: [0,1,2]
            },
        }

        for (const [plName, plValues] of Object.entries(powerlineData)) {

            if(allowedPowerlines[this.currentDay]['apartment'].includes(plValues['apartment'])
               && allowedPowerlines[this.currentDay]['house'].includes(plValues['house'])
               && (allowedPowerlines[this.currentDay]['type'] == null || allowedPowerlines[this.currentDay]['type'].includes(plValues['type']))) {

                const texture = plValues['orientation'] % 2 == 0 ? 'powerlineIntense' : 'powerlineIntenseRotate';
                const width = plValues['orientation'] % 2 == 0 ? plValues['length'] : powerlineBaseData['width']; 
                const height = plValues['orientation'] % 2 == 0 ? powerlineBaseData['width'] : plValues['length']; 
    
                if (plValues['type'] === "mixed") {
                    const plNameArray = [plName+"s", plName+"b"];
                    const plTypeArray = ["mixedSolar", "mixedBought"];
                    const plFrame = [1,2];
                    for (var i = 0; i < plNameArray.length; i++) {
                        powerlines.set(plNameArray[i], new Powerline({
                            scene: this,
                            x: plValues['x'],
                            y: plValues['y'],
                            width: width,
                            height: height,
                            texture: texture,
                            frame: plFrame[i],
                            apartment: plValues['apartment'],
                            orientation: plValues['orientation'],
                            speed: plValues['speed'] * powerlineBaseData['baseSpeed'],
                            house: plValues['house'],
                            isActive: powerlineBaseData['isActive'],
                            type: plTypeArray[i]
                        })); 
                        powerlines.get(plNameArray[i]).setOrigin(0,0);
                    }
                } else {
                    const frame = plValues['type'] === "bought" ? 0 : 3; 
                    powerlines.set(plName, new Powerline({
                        scene: this,
                        x: plValues['x'],
                        y: plValues['y'],
                        width: width,
                        height: height,
                        texture: texture,
                        frame: frame,
                        apartment: plValues['apartment'],
                        orientation: plValues['orientation'],
                        speed: plValues['speed'] * powerlineBaseData['baseSpeed'],
                        house: plValues['house'],
                        isActive: powerlineBaseData['isActive'],
                        type: plValues['type']
                    })); 
                    powerlines.get(plName).setOrigin(0,0);
                }

                powerlinesBackground.set(plName, this.add.rectangle(plValues['x'],plValues['y'],width,height,powerlineBaseData['backgroundColor']));
                powerlinesBackground.get(plName).setDepth(30).setOrigin(0,0);
            }

            
        }

        return [powerlines, powerlinesBackground];

    }
}





