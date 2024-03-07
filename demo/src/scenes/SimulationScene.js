
import { Person } from '../objects/Person.js';
import { Location } from '../objects/Location.js';
import { Activity } from '../objects/Activity.js';

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
       
        this.people = this.add.group({
            /*classType: Person,*/
            runChildUpdate: true
        });
        
        //  Input Events
        this.cursors = this.input.keyboard.createCursorKeys();
        
        //  The score
        this.scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

        // The time 
        this.timeText = this.add.text(this.scale.width-200, 16, `Time: ${this.registry.get("time")}`, { fontSize: '32px', fill: '#000' });

    

        // ---- PEOPLE & PATHS -----------------------------------------

        // create locations, (x,y) points specifying certain locations in/around the apartment
        this.locations = this.createLocations();

        // debug tool to visualise created locations, makes rectangles at given points
        this.locationBlocks = this.createLocationVisuals();

        this.person1 = new Person({
                                key: "person1",
                                scene: this,
                                x: this.locations.get('l100').x,
                                y: this.locations.get('l100').y,
                                apartment: 1,
                                speed: 100,
                                texture: 'rut'});

        this.people.add(this.person1);
        this.person1.setDepth(2);

        this.bindLocationsToPeople();

        var actFridge1 = new Activity({
                                    key: (this.person1.key + "Fridge"),
                                    isIdle: false,
                                    locationKey: this.locations.get('l114').key,
                                    minDuration: 3000,
                                    exitDuration: 500});

        var actStove1 = new Activity({
                                    key: (this.person1.key + "Stove"),
                                    isIdle: false,
                                    locationKey: this.locations.get('l113').key,
                                    minDuration: 3000,
                                    exitDuration: 1000});
        
        this.person1.doActivity(actFridge1);
        this.time.addEvent({ 
            delay: 6000, 
            callback: this.person1.doActivity, 
            callbackScope: this.person1, 
            args: [ actStove1 ] });
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
    }

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
        locations.set('l114', new Location({key:'l114', x: 590, y: 480, apartment: 1, floor: 1}));

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
        this.people.children.each(function(person) {
            var locationsForPerson = [];
            for (var [key, location] of this.locations) {
                if (person.apartment == location.apartment) {
                    locationsForPerson.push(location);
                } 
            }
            person.setPossibleLocations(locationsForPerson);
          }, this);
    }
}





