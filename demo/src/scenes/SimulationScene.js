
import { Person } from '../objects/Person.js';
import { Location } from '../objects/Location.js';
import { Activity } from '../objects/Activity.js';
import { Device } from '../objects/Device.js';

export default class SimulationScene extends Phaser.Scene {

    constructor() {
        super({key: 'SimulationScene'});
    }
    init() {
        this.player = undefined;
        this.platforms = undefined;
        this.ground = undefined;

        this.cursors = undefined;    

        this.score = 0;
        this.gameOver = false;
        this.scoreText = undefined;
    }
    
    preload () {
        //this.load.image('sky', 'assets/sky.png');
        //this.load.image('house', 'assets/house.png');
        //this.load.image('ground', 'assets/platform.png');
        //this.load.spritesheet('rut', 'assets/rut_idle.png', { frameWidth: 32, frameHeight: 48 });
    }

    create () {
        // *****************************************************************
        // TIMER
        // *****************************************************************
        this.timer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTime,
            callbackScope: this,
            loop: true
        });


        // *****************************************************************
        // GAME OBJECTS
        // *****************************************************************

        this.gamezone = this.add.zone(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height);
    
        //  A simple background for our game
        this.sky = this.add.image(0, 0, 'sky').setScale(2.3,1.7);
        Phaser.Display.Align.In.Center(this.sky,this.gamezone);
    
        //  The platforms group contains the ground and the 2 ledges we can jump on
        this.platforms = this.physics.add.staticGroup();
    
        //  Here we create the ground.
        this.ground = this.platforms.create(0, 0, 'ground').setScale(4).refreshBody();
        Phaser.Display.Align.In.BottomCenter(this.ground,this.gamezone);
    
        //  A background for the house
        this.houseBackdrop = this.add.image(0, 0, 'houseBackdrop');
        this.house = this.add.image(0, 0, 'house');
        this.house.setDepth(1);
        
        //  Center the background in the game
        Phaser.Display.Align.To.TopCenter(this.houseBackdrop,this.ground,0,this.ground.height*1.5);
        Phaser.Display.Align.To.TopCenter(this.house,this.ground,0,this.ground.height*1.5);
       
        
        //  Input Events
        this.cursors = this.input.keyboard.createCursorKeys();
        
        //  The score
        this.scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

        // The time 
        this.timeText = this.add.text(this.scale.width-200, 16, `Time: ${this.registry.get("time")}`, { fontSize: '32px', fill: '#000' });


        // ---- GAME & LOGIC OBJECTS -----------------------------------------

        this.people = this.add.group({
            /*classType: Person,*/
            runChildUpdate: true
        });

        // create locations, (x,y) points specifying certain locations in/around the apartment
        this.locations = this.createLocations();

        // debug tool to visualise created locations, makes rectangles at given points
        this.locationBlocks = this.createLocationVisuals();

        // Create devices, that are utilized during specific activities
        this.devices = this.createDevices();

        // Create activites, actions that characters can conduct at given places
        this.activites = this.createActivities();

        // create people
        this.people = this.createPeople();

        // this.person1 = new Person({
        //                         key: "p1",
        //                         scene: this,
        //                         x: this.locations.get('l100').x,
        //                         y: this.locations.get('l100').y,
        //                         apartment: 1,
        //                         speed: 140,
        //                         texture: 'rut'});

        // this.people.add(this.person1);

        this.people.get('p1').setDepth(10);

        this.bindLocationsToPeople();

        this.assignSchedules();
        
        // console.log(this.activites);
        // this.person1.doActivity(this.activites.get('a1Fridge'));

        // this.time.addEvent({ 
        //     delay: 5000, 
        //     callback: this.person1.doActivity, 
        //     callbackScope: this.person1, 
        //     args: [ this.activites.get('a1Stove') ] });

        //     this.time.addEvent({ 
        //         delay: 8000, 
        //         callback: this.person1.doActivity, 
        //         callbackScope: this.person1, 
        //         args: [ this.activites.get('a1DinnerTable') ] });
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

    // Method for creating all locations and binding neighbouring ones
    // Locations are used by the characters to know where they are able to walk
    // coding: "1XYZ", where X: apartment number, Y: floor number, Z: location number (horizontal)
    
    updateTime() {
        this.registry.values.time += 1;
        //console.log(this.registry.get("time"));
        this.timeText.setText(`Time: ${this.registry.get("time")}`, { fontSize: '32px', fill: '#000' });
        this.checkSchedules();
    }

    checkSchedules() {
        for (var [key, person] of this.people) {
            if(person.schedule.has(this.registry.values.time)) {
                person.doActivity(person.schedule.get(this.registry.values.time));
            }
        }
    }

// ----- CREATE LOCATIONS -----------------------------------------------

createLocations() {
    // Create Locations
    const locations = new Map();

    locations.set('l100', new Location({key:'l100', x: 280, y: 360, apartment: 1, floor: 0}));
    locations.set('l101', new Location({key:'l101', x: 375, y: 360, apartment: 1, floor: 0}));
    locations.set('l102', new Location({key:'l102', x: 580, y: 360, apartment: 1, floor: 0}));
    locations.set('l110', new Location({key:'l110', x: 280, y: 480, apartment: 1, floor: 1}));
    locations.set('l111', new Location({key:'l111', x: 390, y: 480, apartment: 1, floor: 1}));
    locations.set('l112', new Location({key:'l112', x: 445, y: 480, apartment: 1, floor: 1}));
    locations.set('l113', new Location({key:'l113', x: 520, y: 480, apartment: 1, floor: 1}));
    locations.set('l114', new Location({key:'l114', x: 575, y: 480, apartment: 1, floor: 1}));

    // Add neighbour links
    locations.get('l100').setNeighbours([locations.get('l101')]);
    locations.get('l100').setNeighboursUpDown({up: null, down: locations.get('l101').key});
    
    locations.get('l101').setNeighbours([locations.get('l100'), locations.get('l112'), locations.get('l102')]);
    locations.get('l101').setNeighboursUpDown({up: null, down: locations.get('l112').key});
    
    locations.get('l102').setNeighbours([locations.get('l101')]);
    locations.get('l102').setNeighboursUpDown({up: null, down: locations.get('l101').key});
    
    locations.get('l110').setNeighbours([locations.get('l111')]);
    locations.get('l110').setNeighboursUpDown({up: locations.get('l111').key, down: null});

    locations.get('l111').setNeighbours([locations.get('l110'),locations.get('l112')]);
    locations.get('l111').setNeighboursUpDown({up: locations.get('l112').key, down: null});
    
    locations.get('l112').setNeighbours([locations.get('l111'), locations.get('l101'), locations.get('l113')]);
    locations.get('l112').setNeighboursUpDown({up: locations.get('l101').key, down: null});
    
    locations.get('l113').setNeighbours([locations.get('l112'), locations.get('l114')]);
    locations.get('l113').setNeighboursUpDown({up: locations.get('l112').key, down: null});

    locations.get('l114').setNeighbours([locations.get('l113')]);
    locations.get('l114').setNeighboursUpDown({up: locations.get('l113').key, down: null});
    
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
      };
}


// ----- CREATE DEVICES -----------------------------------------------

createDevices() {
    // Create Devices
    const devices = new Map();
    devices.set('d1Stove', new Device({
                                    key:'d1Stove', 
                                    scene: this,
                                    x: 504, 
                                    y: 480, 
                                    apartment: 1, 
                                    texture: 'stove',
                                    powerConsumption: 100,
                                    animationKeys: {
                                        idle: 'stoveIdle',
                                        active: 'stoveActive'
                                    },
                                    repeatAnimation: true}));

    devices.set('d1Fridge', new Device({
                                    key:'d1Fridge', 
                                    scene: this,
                                    x: 596, 
                                    y: 464, 
                                    apartment: 1, 
                                    texture: 'fridge',
                                    powerConsumption: 100,
                                    animationKeys: {
                                        idle: 'fridgeIdle',
                                        active: 'fridgeActive'
                                    },
                                    repeatAnimation: false}));

    //devices.get('d1stove').anims.play('stoveActive',true);     

    for(var [key, device] of devices) {
        device.setDepth(2);
    }

    return devices;
}

// ----- CREATE ACTIVITIES -----------------------------------------------
    createActivities() {
        const activities = new Map();

        activities.set("a1Fridge", new Activity({
            key: "a1Fridge",
            isIdle: false,
            locationKey: this.locations.get('l114').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: this.devices.get("d1Fridge")}));

        activities.set("a1Stove", new Activity({
            key: "a1Stove",
            isIdle: false,
            locationKey: this.locations.get('l113').key,
            minDuration: 3000,
            startDuration: 300,
            exitDuration: 300,
            device: this.devices.get("d1Stove")}));

            activities.set("a1DinnerTable", new Activity({
                key: "a1DinnerTable",
                isIdle: false,
                locationKey: this.locations.get('l111').key,
                minDuration: 3000,
                startDuration: 300,
                exitDuration: 300,
                device: null}));

        return activities;
    }

// ------- CREATE PEOPLE -------------------------------------------------

    createPeople() {

        const people = new Map();

        people.set("p1", new Person({
            key: "p1",
            scene: this,
            x: this.locations.get('l100').x,
            y: this.locations.get('l100').y,
            apartment: 1,
            speed: 140,
            texture: 'rut'}));

        return people;
    }

// -------- ASSIGN SCHEDULES -------------------------------------------

    assignSchedules() {
        
        const schedule1 = new Map();
        schedule1.set(3, this.activites.get('a1Fridge'));
        schedule1.set(8, this.activites.get('a1Stove'));
        schedule1.set(12, this.activites.get('a1DinnerTable'));
        this.people.get("p1").setSchedule(schedule1);
}

}





