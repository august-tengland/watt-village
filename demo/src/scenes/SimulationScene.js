
import { Person } from '../objects/Person.js';
import { Location } from '../objects/Location.js';

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

        this.locations = this.createLocations();
        this.createLocationVisuals();
        this.person1 = new Person({
                                scene: this,
                                x: this.l100.x,
                                y: this.l100.y,
                                apartment: 1,
                                speed: 100,
                                texture: 'rut'});

        this.people.add(this.person1);
        this.person1.setDepth(2);

        this.bindLocationsToPeople();

        this.person1.walkToLocation('l112');
        this.time.addEvent({ 
            delay: 6000, 
            callback: this.person1.walkToLocation, 
            callbackScope: this.person1, 
            args: ['l100'] });
    }

    update () {
        if (this.gameOver)
        {
            return;
        }
    
    }

    // Method for creating all locations and binding neighbouring ones
    // Locations are used by the characters to know where they are able to walk
    // coding: "1XYZ", where X: apartment number, Y: floor number, Z: location number (horizontal)
    
    updateTime() {
        this.registry.values.time += 1;
        console.log(this.registry.get("time"));
        this.timeText.setText(`Time: ${this.registry.get("time")}`, { fontSize: '32px', fill: '#000' });
    }

    createLocations() {
        // Create Locations
        var locations = [];

        this.l100 = new Location({key:'l100', x: 280, y: 360, apartment: 1, floor: 0});
        this.l101 = new Location({key:'l101', x: 375, y: 360, apartment: 1, floor: 0});
        this.l102 = new Location({key:'l102', x: 580, y: 360, apartment: 1, floor: 0});
        this.l110 = new Location({key:'l110', x: 280, y: 480, apartment: 1, floor: 1});
        this.l111 = new Location({key:'l111', x: 445, y: 480, apartment: 1, floor: 1});
        this.l112 = new Location({key:'l112', x: 580, y: 480, apartment: 1, floor: 1});

        // Add neighbour links
        this.l100.setNeighbours([this.l101]);
        this.l100.setNeighboursUpDown({up: null, down: this.l101.key});
        
        this.l101.setNeighbours([this.l100, this.l111, this.l102]);
        this.l101.setNeighboursUpDown({up: null, down: this.l111.key});
        
        this.l102.setNeighbours([this.l101]);
        this.l102.setNeighboursUpDown({up: null, down: this.l101.key});
        
        this.l110.setNeighbours([this.l111]);
        this.l110.setNeighboursUpDown({up: this.l111.key, down: null});
        
        this.l111.setNeighbours([this.l110, this.l101, this.l112]);
        this.l111.setNeighboursUpDown({up: this.l101.key, down: null});
        
        this.l112.setNeighbours([this.l111]);
        this.l112.setNeighboursUpDown({up: this.l111.key, down: null});
        
        locations.push(this.l100, this.l101, this.l102, this.l110, this.l111, this.l112);
        return locations;
    }
    // Method to generated small rectangles to visualize the position of each position
    createLocationVisuals() {
        this.lb100 = this.add.rectangle(this.l100.x,this.l100.y,4,4,"0x00ff00");
        this.lb101 = this.add.rectangle(this.l101.x,this.l101.y,4,4,"0x00ff00");
        this.lb102 = this.add.rectangle(this.l102.x,this.l102.y,4,4,"0x00ff00");
        this.lb110 = this.add.rectangle(this.l110.x,this.l110.y,4,4,"0x00ff00");
        this.lb111 = this.add.rectangle(this.l111.x,this.l111.y,4,4,"0x00ff00");
        this.lb112 = this.add.rectangle(this.l112.x,this.l112.y,4,4,"0x00ff00");
    }

    // Method to assign each person the possible locations that they can be present at
    bindLocationsToPeople() {
        this.people.children.each(function(person) {
            var locationsForPerson = [];
            for (var i = 0; i < this.locations.length; i++) {
                if (person.apartment == this.locations[i].apartment) {
                    locationsForPerson.push(this.locations[i]);
                } 
            }
            person.setPossibleLocations(locationsForPerson);
          }, this);
    }
}





