
import { Person } from '../objects/Person.js';
import { Location } from '../objects/Location.js';
import { Activity } from '../objects/Activity.js';
import { Device } from '../objects/Device.js';
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

        // Controls playback speed of entire gameplay
        this.playbackSpeed = 2;

        // Controls speed of animations
        this.speedyAnimations = true;
        this.setSpeedyAnimations(this.speedyAnimations);

        // Starting time for scene
        this.registry.values.time = 6*this.tucf;

        // Determines which schedules to follow 
        this.currentDay = "day1";

        // Used to keep track of whether timer should be on or off (i.e. "speedup")
        this.numMovingCharacters = 0;

        // Base speed value for all characters
        this.characterSpeed = 200;

        // What is the optimal effect of the solar panels installed on the roof? (per house)
        this.solarPanelEffects = [12, 15]; //kWh (per hour)

        var offsetsArray = this.setOffsets();
        this.baseOffset = offsetsArray[0];
        this.offsets = offsetsArray[1]; 

        this.scheduleHandler = new ScheduleHandler({scene: this, currentDayKey: this.currentDay, tucf: this.tucf});
    }
    
    create () {
        // *****************************************************************
        // TIMER & EVENT HANDLERS 
        // *****************************************************************
        
        this.gameTimer = this.time.addEvent({
            delay: 1000/this.playbackSpeed,
            callback: this.updateTime,
            callbackScope: this,
            loop: true
        });
        
        this.events.on('personStartedMoving', this.handlePersonStartedMoving, this);

        this.events.on('personStoppedMoving', this.handlePersonStoppedMoving, this);

        this.events.emit('timeChanged',this.registry.values.time);

        // *****************************************************************
        // GAME OBJECTS
        // *****************************************************************

        this.gamezone = this.add.zone(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height);
    
        //  A simple background for our game
        this.sky = this.add.image(0, 0, 'sky').setScale(2.6,2);
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
        
        //  Input Events
        this.cursors = this.input.keyboard.createCursorKeys();

        this.powerLine = this.add.sprite(500,680,'powerLine').setScale(2);
        this.powerLine.anims.play("powerLineActive");
        this.powerLine.setDepth(5);

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
        this.locationBlocks = this.createLocationVisuals();

        // Create devices, that are utilized during specific activities
        this.devices = this.createDevices();

        // Create activities, actions that characters can conduct at given places
        this.activities = this.createActivities();

        // Create people
        this.people = this.createPeople();

        // Create energy & solar handlers
        this.individualEnergyHandlers = this.createIndividualEnergyHandlers();
        console.log(this.individualEnergyHandlers);

        this.houseSolarPanelHandlers = this.createHouseSolarPanelHandlers();
        console.log(this.houseSolarPanelHandlers);

        this.totalEnergyHandler = this.createTotalEnergyHandler();
        console.log(this.totalEnergyHandler);

        this.updatePlaybackSpeed();

        this.bindLocationsToPeople();

        this.assignSchedules();
        
    }

    update () {
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
            "1": { "x": baseOffset['x'] + 0, "y": baseOffset['y'] + 0 },
            "2": { "x": baseOffset['x'] + 147, "y": baseOffset['y'] + -1 },
            "3": { "x": baseOffset['x'] + 0, "y": baseOffset['y'] + 277 },
            "4": { "x": baseOffset['x'] + 147, "y": baseOffset['y'] + 277-1 }
        }
        
        return [baseOffset, offsets];
    }

    updateTime() {
        this.registry.values.time += 1;
        this.events.emit('timeChanged',this.registry.values.time);
        this.updateHandlers();
        this.checkSchedules();
    }

    checkSchedules() {
        
        for (var [key, person] of this.people) {
            if(person.schedule.has(this.registry.values.time.toString())) {
                console.log("person ", person.key, "doing activity:", person.schedule.get(this.registry.values.time.toString()));
                person.doActivity(person.schedule.get(this.registry.values.time.toString()));
            }
        }
    }


    handlePersonStartedMoving(personKey) {
        this.numMovingCharacters += 1;
        console.log(personKey,"started moving");
        console.log("increase: " + this.numMovingCharacters);
        this.setSpeedyAnimations(false);
        this.gameTimer.paused = true;
    }
    handlePersonStoppedMoving(personKey) {
        console.log(personKey,"stopped moving");
        console.log("decrease: " + this.numMovingCharacters);
        this.numMovingCharacters -= 1;
        if (this.numMovingCharacters == 0) {
            this.setSpeedyAnimations(true);
            this.gameTimer.paused = false;
        }
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

// *********************************************************************
// ------- CREATION METHODS  -------------------------------------------
// *********************************************************************
 

createSolarPanels() {
    var solarPanels = new Map([
        ['small1', this.add.image(0, 0, 'solarPanel')],
        ['small2', this.add.image(0, 0, 'solarPanel')],
        ['big1', this.add.image(0, 0, 'solarPanel')],
        ['big2', this.add.image(0, 0, 'solarPanel')],
        ['big3', this.add.image(0, 0, 'solarPanel')],
    ]);
    Phaser.Display.Align.To.TopLeft(solarPanels.get('small1'),this.houseSmallBackdrop,0,0);
    Phaser.Display.Align.To.TopRight(solarPanels.get('small2'),this.houseSmallBackdrop,0,0);
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
            "0": { "x": 280, "y": 480 },
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
            "5": { "x": 1260, "y": 480 }
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
                //console.log("current location:", locationKey);
                //console.log("neighbour list:", neighbourList);
                //console.log("neighbours up & down:", neighbourUpDownObject);
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

    const deviceInfo = {
        "stove": {
            texture: 'stove',
            powerConsumption: 2.0/this.tucf,
            isIdleConsuming: false,
            animationKeys: {
                idle: 'stoveIdle',
                active: 'stoveActive'
            },
            repeatAnimation: true
        },
        "fridge": {
            texture: 'fridge',
            powerConsumption: 0.042/this.tucf, // kHw (per hour), = 1kWh / day
            isIdleConsuming: true,
            animationKeys: {
                idle: 'fridgeIdle',
                active: 'fridgeActive'
            },
            repeatAnimation: false
        },
        "washingMachine": {
            texture: 'stove',
            powerConsumption: 2.0/this.tucf, // kHw (per hour), = 1kWh / day
            isIdleConsuming: false,
            animationKeys: {
                idle: 'stove',
                active: 'stove'
            },
            repeatAnimation: true
        }
    }

    const basePositionsSmall = {
        "stove": { "x": 502, "y": 480 },
        "fridge": { "x": 596, "y": 464 },
        "washingMachine": { "x": 520, "y": 350 }
    }

    const basePositionsBig = {
        "stove": { "x": 885, "y": 480 },
        "fridge": { "x": 736, "y": 465 },
        "washingMachine": { "x": 865, "y": 350 }
    }

    for (var apartment = 1; apartment <= 4; apartment++) {
        const deviceSuffix = "d" + apartment;
        const basePositions = apartment % 2 == 0 ? basePositionsBig : basePositionsSmall;  
        for (const [deviceName, DeviceValues] of Object.entries(deviceInfo)) {
            const deviceKey = deviceSuffix + deviceName;
            const postitions = {
                x: basePositions[deviceName]['x'] + this.offsets[apartment]['x'],
                y: basePositions[deviceName]['y'] + this.offsets[apartment]['y']
            }
            devices.set(deviceKey, new Device({key: deviceKey, 
                                               scene: this, 
                                               apartment: apartment, 
                                               ...postitions, 
                                               ...DeviceValues}));
        }
    }

    for(var [key, device] of devices) {
        device.setDepth(5);
    }

    
    return devices;
}

// ----- CREATE ACTIVITIES -----------------------------------------------
    createActivities() {
        const activities = new Map();

        const activityInfo = {
            "fridge": {
                isIdleActivity: false,
                minDuration: 3000,
                startDuration: 300,
                exitDuration: 300,
                deviceType: "fridge" 
            },
            "stove": {
                isIdleActivity: false,
                minDuration: 3000,
                startDuration: 300,
                exitDuration: 300,
                deviceType: "stove" 
            },
            "dinnerTable": {
                isIdleActivity: false,
                minDuration: 3000,
                startDuration: 300,
                exitDuration: 300,
                deviceType: null 
            },
            "washingMachine": {
                isIdleActivity: false,
                minDuration: 3000,
                startDuration: 300,
                exitDuration: 300,
                deviceType: "washingMachine"
            },
            "goToWork": {
                isIdleActivity: false,
                minDuration: 3000,
                startDuration: 0,
                exitDuration: 0,
                deviceType: null 
            },
            "bathroom": {
                isIdleActivity: false,
                minDuration: 3000,
                startDuration: 0,
                exitDuration: 0,
                deviceType: null 
            },
            "couch": {
                isIdleActivity: false,
                minDuration: 3000,
                startDuration: 0,
                exitDuration: 0,
                deviceType: null 
            },
            "tv": {
                isIdleActivity: false,
                minDuration: 3000,
                startDuration: 0,
                exitDuration: 0,
                deviceType: null 
            },
            "book": {
                isIdleActivity: false,
                minDuration: 3000,
                startDuration: 0,
                exitDuration: 0,
                deviceType: null 
            },
            "bed": {
                isIdleActivity: false,
                minDuration: 3000,
                startDuration: 0,
                exitDuration: 0,
                deviceType: null 
            },
        }

        const baseLocationSuffixSmall = {
            "stove": "13", 
            "fridge": "14",
            "dinnerTable": "11",
            "washingMachine": "02",
            "goToWork": "20",
            "bathroom": "02",
            "bed": "10",
            "couch": "00",
            "tv": "00",
            "book": "00"
        }
    
        const baseLocationSuffixBig = {
            "stove": "12", 
            "fridge": "11",
            "dinnerTable": "13",
            "washingMachine": "02",
            "goToWork": "20",
            "bathroom": "00",
            "bed": "15",
            "couch": "02",
            "tv": "02",
            "book": "02"
        }

        for (var apartment = 1; apartment <= 4; apartment++) {
            const activitySuffix = "a" + apartment;
            const baseLocationSuffix = apartment % 2 == 0 ? baseLocationSuffixBig : baseLocationSuffixSmall;  
            for (const [activityName, activityValues] of Object.entries(activityInfo)) {
                if(activityName in baseLocationSuffix) {
                    const activityKey = activitySuffix + activityName;
                    const device = activityValues.deviceType ? this.devices.get("d" + apartment + activityValues.deviceType) : null; 
                    const locationKey = "l" + apartment + baseLocationSuffix[activityName];
                    activities.set(activityKey, new Activity({key: activityKey, 
                                                              scene: this, 
                                                              apartment: apartment, 
                                                              device: device, 
                                                              locationKey: locationKey, 
                                                              ...activityValues}));    
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
            isControlledPerson: true,
            scene: this,
            x: this.locations.get('l110').x,
            y: this.locations.get('l110').y,
            apartment: 1,
            speed: this.characterSpeed,
            texture: 'rut'}));

        // APARTMENT 2 

        people.set("p2", new Person({
            key: "p2",
            scene: this,
            x: this.locations.get('l215').x,
            y: this.locations.get('l215').y,
            apartment: 2,
            speed: this.characterSpeed,
            texture: 'rut'}));


        // APARTMENT 3 

        people.set("p3", new Person({
            key: "p3",
            scene: this,
            x: this.locations.get('l310').x,
            y: this.locations.get('l310').y,
            apartment: 3,
            speed: this.characterSpeed,
            texture: 'rut'}));

        // APARTMENT 4

        people.set("p4", new Person({
            key: "p4",
            scene: this,
            x: this.locations.get('l415').x,
            y: this.locations.get('l415').y,
            apartment: 4,
            speed: this.characterSpeed,
            texture: 'rut'}));

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
            //console.log("possible locations for person ", person.key, ": ", locationsForPerson);
        };
    }

// -------- ASSIGN SCHEDULES -------------------------------------------

    assignSchedules() {
        
        for (var [key, person] of this.people) {
            var schedule = null;
            if(person.isControlledPerson) {
                var timestep = (8*this.tucf).toString();
                schedule = this.scheduleHandler.createControlledSchedule(person.key, {timestep: "a1goToWork"}, this.activities);
                person.setSchedule(schedule);
            } else {
                schedule = this.scheduleHandler.getSchedule(person.key, this.activities);
            }
            person.setSchedule(schedule);
        };
        // APARTMENT 1 
/*
        const schedule1 = new Map();
        schedule1.set(3, this.activities.get('a1Fridge'));
        schedule1.set(8, this.activities.get('a1Stove'));
        schedule1.set(12, this.activities.get('a1DinnerTable'));
        schedule1.set(4, this.activities.get('a1WashingMachine'));
        this.people.get("p1").setSchedule(schedule1);

        // APARTMENT 2 

        const schedule2 = new Map();
        schedule2.set(1, this.activities.get('a2Fridge'));
        schedule2.set(5, this.activities.get('a2Stove'));
        schedule2.set(8, this.activities.get('a2DinnerTable'));
        this.people.get("p2").setSchedule(schedule2);

        // APARTMENT 3 

        const schedule3 = new Map();
        //schedule3.set(2, this.activities.get('a3Fridge'));
        //schedule3.set(7, this.activities.get('a3Stove'));
        //schedule3.set(11, this.activities.get('a3DinnerTable'));
        schedule3.set(4, this.activities.get('a3DinnerTable'));
        this.people.get("p3").setSchedule(schedule3);
*/
        //console.log(this.people.get("p1"));
        //console.log(this.people.get("p3"));
    }

// ----- CREATE ENERGY HANDLERS --------------------------------------

    createIndividualEnergyHandlers() {

        const individualEnergyHandlers = new Map();

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
                currentDayKey: this.currentDay}));
        }
        
        return individualEnergyHandlers;
    }

    createHouseSolarPanelHandlers() {

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
            currentDayKey: this.currentDay});

        return totalEnergyHandler;
    }


}





