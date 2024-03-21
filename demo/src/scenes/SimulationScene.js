
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

        this.playbackSpeed = 1;

        this.currentDay = "day1";

        // What is the optimal effect of the solar panels installed on the roof?
        this.solarPanelEffect0 = 12; //kWh (per hour)
        this.solarPanelEffect1 = 15; //kWh (per hour)

        this.scheduleHandler = new ScheduleHandler({scene: this, currentDayKey: this.currentDay, tucf: this.tucf});
    }
    
    create () {
        console.log("create called");
        // Used to change the absolute positions of most things in the scene
        this.offsets = this.setOffsets();
        // *****************************************************************
        // TIMER
        // *****************************************************************
        
        this.timer = this.time.addEvent({
            delay: 1000/this.playbackSpeed,
            callback: this.updateTime,
            callbackScope: this,
            loop: true
        });


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
        //  Foreground of the houses
        this.houseSmall = this.add.image(0, 0, 'houseSmall');
        this.houseBig = this.add.image(0, 0, 'houseBig');

        this.houseSmall.setDepth(1);
        this.houseBig.setDepth(1);
        
        Phaser.Display.Align.To.TopCenter(this.houseSmallBackdrop,this.ground,-280,this.ground.height*2.3);
        Phaser.Display.Align.To.TopCenter(this.houseBigBackdrop,this.ground,420,this.ground.height*2.3);
        
        Phaser.Display.Align.In.Center(this.houseSmall,this.houseSmallBackdrop);
        Phaser.Display.Align.In.Center(this.houseBig,this.houseBigBackdrop);
        
        //  Input Events
        this.cursors = this.input.keyboard.createCursorKeys();

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
            "4": { "x": baseOffset['x'] + 145, "y": baseOffset['y'] + 277-1 }
        }
        
        return offsets;
    }

    updateTime() {
        this.registry.values.time += 1;
        this.events.emit('timeChanged',this.registry.values.time);
        this.checkSchedules();
        this.updateHandlers();
    }

    checkSchedules() {
        for (var [key, person] of this.people) {
            console.log("schedule for person", key, ": ", person.schedule);
            if(person.schedule.has(this.registry.values.time.toString())) {
                console.log("person ", person.key, "doing activity:", person.schedule.get(this.registry.values.time.toString()));
                person.doActivity(person.schedule.get(this.registry.values.time.toString()));
            }
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

    updateHandlers() {

        //this.totalEnergyHandler.runUpdate(this.registry.values.time);

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
            "5": { "x": 600, "y": 480 }
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
            "0": { "x": 750, "y": 480 },
            "1": { "x": 890, "y": 480 },
            "2": { "x": 1000, "y": 480 },
            "3": { "x": 1077, "y": 480 },
            "4": { "x": 1260, "y": 480 }
        }
    };

    for (var apartment = 1; apartment <= 4; apartment++) {
        const baseValues = apartment % 2 == 0 ? baseValuesBig : baseValuesSmall;  
        for (const [floor, floorValues] of Object.entries(baseValues)) {
            for (const [locationEndKey, locationCoordinates] of Object.entries(floorValues)) {
                var locationKey = "l" + apartment + floor + locationEndKey;
                //console.log(locationKey);
                //console.log(locationCoordinates);
                locations.set(locationKey, new Location({key:locationKey, x: locationCoordinates['x']+this.offsets[apartment]["x"], y: locationCoordinates['y']+this.offsets[apartment]["y"], apartment: apartment, floor: floor}));
                //console.log(locations.get(locationKey));
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
            "5": ["14"]
        }
    };

    const neighboursUpDownSmall = {
        "0": {
            "0": { "up": null, "down": "01" },
            "1": { "up": null, "down": "12" },
            "2": { "up": null, "down": "01" }
        },
        "1": {
            "0": { "up": "11", "down": null },
            "1": { "up": "12", "down": null },
            "2": { "up": "01", "down": null },
            "3": { "up": "12", "down": null },
            "4": { "up": "13", "down": null },
            "5": { "up": "14", "down": null }
        }
    };

    const neighboursBig = {
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
            "4": ["13"]
        }
    };

    const neighboursUpDownBig = {
        "0": {
            "0": { "up": null, "down": "01" },
            "1": { "up": null, "down": "13" },
            "2": { "up": null, "down": "01" }
        },
        "1": {
            "0": { "up": "11", "down": null },
            "1": { "up": "12", "down": null },
            "2": { "up": "13", "down": null },
            "3": { "up": "01", "down": null },
            "4": { "up": "13", "down": null },
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
        locationBlocks.get(key).setDepth(2);
    }
}



// ----- CREATE DEVICES -----------------------------------------------

createDevices() {
    // Create Devices
    const devices = new Map();

    var basePositionsSmall = {
        "stove": { "x": 502, "y": 480 },
        "fridge": { "x": 596, "y": 464 },
        "washingMachine": { "x": 520, "y": 350 }
    }

    var basePositionsBig = {
        "stove": { "x": 885, "y": 480 },
        "fridge": { "x": 736, "y": 465 },
        "washingMachine": { "x": 865, "y": 350 }
    }

    // --- APARTMENT 1 --------------------------------

    devices.set('d1Stove', new Device({
                                    key:'d1Stove', 
                                    scene: this,
                                    x: basePositionsSmall['stove']['x']+this.offsets['1']['x'], 
                                    y: basePositionsSmall['stove']['y']+this.offsets['1']['y'], 
                                    apartment: 1, 
                                    texture: 'stove',
                                    powerConsumption: 2.0/this.tucf, //kWh (per hour)
                                    isIdleConsuming: false,
                                    animationKeys: {
                                        idle: 'stoveIdle',
                                        active: 'stoveActive'
                                    },
                                    repeatAnimation: true}));

    devices.set('d1Fridge', new Device({
                                    key:'d1Fridge', 
                                    scene: this,
                                    x: basePositionsSmall['fridge']['x']+this.offsets['1']['x'], 
                                    y: basePositionsSmall['fridge']['y']+this.offsets['1']['y'], 
                                    apartment: 1, 
                                    texture: 'fridge',
                                    powerConsumption: 0.042/this.tucf, // kHw (per hour), = 1kWh / day
                                    isIdleConsuming: true,
                                    animationKeys: {
                                        idle: 'fridgeIdle',
                                        active: 'fridgeActive'
                                    },
                                    repeatAnimation: false}));

    devices.set('d1WashingMachine', new Device({
                                    key:'d1WashingMachine', 
                                    scene: this,
                                    x: basePositionsSmall['washingMachine']['x']+this.offsets['1']['x'], 
                                    y: basePositionsSmall['washingMachine']['y']+this.offsets['1']['y'], 
                                    apartment: 1, 
                                    texture: 'stove',
                                    powerConsumption: 2.0/this.tucf, // kHw per hour
                                    isIdleConsuming: false,
                                    animationKeys: {
                                        idle: 'stoveIdle',
                                        active: 'stoveActive'
                                    },
                                    repeatAnimation: true}));

    // --- APARTMENT 2 --------------------------------

    devices.set('d2Stove', new Device({
                                    key:'d2Stove', 
                                    scene: this,
                                    x: basePositionsBig['stove']['x']+this.offsets['2']['x'], 
                                    y: basePositionsBig['stove']['y']+this.offsets['2']['y'], 
                                    apartment: 2, 
                                    texture: 'stove',
                                    powerConsumption: 2.0/this.tucf, //kWh (per hour)
                                    isIdleConsuming: false,
                                    animationKeys: {
                                        idle: 'stoveIdle',
                                        active: 'stoveActive'
                                    },
                                    repeatAnimation: true}));

    devices.set('d2Fridge', new Device({
                                    key:'d2Fridge', 
                                    scene: this,
                                    x: basePositionsBig['fridge']['x']+this.offsets['2']['x'], 
                                    y: basePositionsBig['fridge']['y']+this.offsets['2']['y'], 
                                    apartment: 2, 
                                    texture: 'fridge',
                                    powerConsumption: 0.042/this.tucf, // kHw (per hour), = 1kWh / day
                                    isIdleConsuming: true,
                                    animationKeys: {
                                        idle: 'fridgeIdle',
                                        active: 'fridgeActive'
                                    },
                                    repeatAnimation: false}));

    // --- APARTMENT 3 --------------------------------

    devices.set('d3Stove', new Device({
                                    key:'d3Stove', 
                                    scene: this,
                                    x: basePositionsSmall['stove']['x']+this.offsets['3']['x'], 
                                    y: basePositionsSmall['stove']['y']+this.offsets['3']['y'], 
                                    apartment: 3, 
                                    texture: 'stove',
                                    powerConsumption: 2.0/this.tucf, //kWh (per time unit)
                                    isIdleConsuming: false,
                                    animationKeys: {
                                        idle: 'stoveIdle',
                                        active: 'stoveActive'
                                    },
                                    repeatAnimation: true}));

    devices.set('d3Fridge', new Device({
                                    key:'d3Fridge', 
                                    scene: this,
                                    x: basePositionsSmall['fridge']['x']+this.offsets['3']['x'], 
                                    y: basePositionsSmall['fridge']['y']+this.offsets['3']['y'], 
                                    apartment: 3, 
                                    texture: 'fridge',
                                    powerConsumption: 0.042/this.tucf, // kHw (time unit), = 1kWh / day
                                    isIdleConsuming: true,
                                    animationKeys: {
                                        idle: 'fridgeIdle',
                                        active: 'fridgeActive'
                                    },
                                    repeatAnimation: false}));

 

    for(var [key, device] of devices) {
        device.setDepth(2);
    }

    return devices;
}

// ----- CREATE ACTIVITIES -----------------------------------------------
    createActivities() {
        const activities = new Map();

        // APARTMENT 1 

        activities.set("a1Fridge", new Activity({
            key: "a1Fridge",
            isIdleActivity: false,
            locationKey: this.locations.get('l114').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: this.devices.get("d1Fridge")}));

        activities.set("a1Stove", new Activity({
            key: "a1Stove",
            isIdleActivity: false,
            locationKey: this.locations.get('l113').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: this.devices.get("d1Stove")}));

        activities.set("a1DinnerTable", new Activity({
            key: "a1DinnerTable",
            isIdleActivity: false,
            locationKey: this.locations.get('l111').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: null}));

        activities.set("a1WashingMachine", new Activity({
            key: "a1WashingMachine",
            isIdleActivity: true,
            locationKey: this.locations.get('l102').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: this.devices.get("d1WashingMachine")}));

        // APARTMENT 2 

        activities.set("a2Fridge", new Activity({
            key: "a2Fridge",
            isIdleActivity: false,
            locationKey: this.locations.get('l210').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: this.devices.get("d2Fridge")}));

        activities.set("a2Stove", new Activity({
            key: "a2Stove",
            isIdleActivity: false,
            locationKey: this.locations.get('l211').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: this.devices.get("d2Stove")}));

        activities.set("a2DinnerTable", new Activity({
            key: "a2DinnerTable",
            isIdleActivity: false,
            locationKey: this.locations.get('l212').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: null}));

        // APARTMENT 3 

        activities.set("a3Fridge", new Activity({
            key: "a3Fridge",
            isIdleActivity: false,
            locationKey: this.locations.get('l314').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: this.devices.get("d3Fridge")}));

        activities.set("a3Stove", new Activity({
            key: "a3Stove",
            isIdleActivity: false,
            locationKey: this.locations.get('l313').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: this.devices.get("d3Stove")}));

        activities.set("a3DinnerTable", new Activity({
            key: "a3DinnerTable",
            isIdleActivity: false,
            locationKey: this.locations.get('l311').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: null}));

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
            x: this.locations.get('l100').x,
            y: this.locations.get('l100').y,
            apartment: 1,
            speed: 200,
            texture: 'rut'}));

        // APARTMENT 2 

        people.set("p2", new Person({
            key: "p2",
            scene: this,
            x: this.locations.get('l202').x,
            y: this.locations.get('l202').y,
            apartment: 2,
            speed: 200,
            texture: 'rut'}));


        // APARTMENT 3 

        people.set("p3", new Person({
            key: "p3",
            scene: this,
            x: this.locations.get('l300').x,
            y: this.locations.get('l300').y,
            apartment: 3,
            speed: 200,
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
                schedule = this.scheduleHandler.createControlledSchedule(person.key, {"8": "a1Fridge"}, this.activities);
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

        // TODO: BIND apartment-specific devices to energy handlers
        var individualDevices1 = new Map();
        var individualDevices2 = new Map();
        var individualDevices3 = new Map();

        
        for(var [key, device] of this.devices) {
            if(device.apartment == 1){
                individualDevices1.set(device.key, device);
            } else if(device.apartment == 2) {
                individualDevices2.set(device.key, device);    
            } else if(device.apartment == 3) {
                individualDevices3.set(device.key, device);    
            }
        }

        // Create energy handler, that manages updates to electricity
        individualEnergyHandlers.set("ieh1", new IndividualEnergyHandler({scene: this, 
            key: "ieh1",
            apartment: 1,
            house: 0,
            devices: individualDevices1, 
            time: this.registry.values.time,
            dayLength: this.dayLength,
            currentDayKey: this.currentDay}));
        
        individualEnergyHandlers.set("ieh2", new IndividualEnergyHandler({scene: this, 
            key: "ieh2",
            apartment: 2,
            house: 1,
            devices: individualDevices2, 
            time: this.registry.values.time,
            dayLength: this.dayLength,
            currentDayKey: this.currentDay}));

        individualEnergyHandlers.set("ieh3", new IndividualEnergyHandler({scene: this, 
            key: "ieh3",
            apartment: 3,
            house: 0,
            devices: individualDevices3, 
            time: this.registry.values.time,
            dayLength: this.dayLength,
            currentDayKey: this.currentDay}));
        
        return individualEnergyHandlers;
    }

    createHouseSolarPanelHandlers() {

        const houseSolarPanelHandlers = new Map();
        
        // Create house solar panel handlers, that manages updates to energy production
        houseSolarPanelHandlers.set("hsph0", new HouseSolarPanelHandler({scene: this, 
            key: "hsph0",
            house: 0,
            time: this.registry.values.time,
            dayLength: this.dayLength,
            solarPanelEffect: this.solarPanelEffect0/this.tucf,
            currentDayKey: this.currentDay}));

        houseSolarPanelHandlers.set("hsph1", new HouseSolarPanelHandler({scene: this, 
            key: "hsph1",
            house: 1,
            time: this.registry.values.time,
            dayLength: this.dayLength,
            solarPanelEffect: this.solarPanelEffect1/this.tucf,
            currentDayKey: this.currentDay}));

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





