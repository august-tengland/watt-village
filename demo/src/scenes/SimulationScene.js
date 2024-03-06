
import { Person } from '../objects/Person.js';

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
        this.house = this.add.image(0, 0, 'house');
        //  Center the background in the game
        Phaser.Display.Align.To.TopCenter(this.house,this.ground,0,this.ground.height*1.5);
       
        // *****************************************************************
        // GAME OBJECTS
        // *****************************************************************
        this.people = this.add.group({
            /*classType: Person,*/
            runChildUpdate: true
        });
        // The player and its settings
        //this.player = this.physics.add.sprite(800, 400, 'rut');
    
        //  Player physics properties. Give the little guy a slight bounce.
        //this.player.setBounce(0.2);
        //this.player.setCollideWorldBounds(true);
    
        const wallColor = 0x000000;
    
        this.wallLeft = this.add.rectangle(0,0,6,this.house.height,wallColor);
        this.wallMiddle = this.add.rectangle(0,0,55,this.house.height,wallColor);
        this.wallRight = this.add.rectangle(0,0,6,this.house.height,wallColor);
    
        this.firstFloor = this.add.rectangle(0,0,this.house.width,6,wallColor);
        this.secondFloor = this.add.rectangle(0,0,this.house.width,4,wallColor);
        this.thirdFloor = this.add.rectangle(0,0,this.house.width,12,wallColor);
        this.fourthFloor = this.add.rectangle(0,0,this.house.width,4,wallColor);
        this.roof = this.add.rectangle(0,0,this.house.width,6,wallColor);
    
        this.apartmentWallHeight = this.house.height/4.7; 
        this.apartmentWallWidth = 10;
    
        Phaser.Display.Align.In.LeftCenter(this.wallLeft,this.house);
        Phaser.Display.Align.In.Center(this.wallMiddle,this.house,-106);
        Phaser.Display.Align.In.RightCenter(this.wallRight,this.house);
        
        Phaser.Display.Align.In.BottomCenter(this.firstFloor,this.house);
        Phaser.Display.Align.In.Center(this.secondFloor,this.house,0,150);
        Phaser.Display.Align.In.Center(this.thirdFloor,this.house);
        Phaser.Display.Align.In.Center(this.fourthFloor,this.house,0,-123);
        Phaser.Display.Align.In.TopCenter(this.roof,this.house);
    

        const wallGrouping = [this.wallLeft,
                              this.wallMiddle,
                              this.wallRight,
                              this.firstFloor,
                              this.secondFloor,
                              this.thirdFloor,
                              this.fourthFloor,
                              this.roof]; 
    
        this.platforms.addMultiple(wallGrouping,false);
    
        // Our player animations, including idle.
        // this.anims.create({
        //     key: 'idle',
        //     frames: this.anims.generateFrameNumbers('rut', { start: 1, end: 10}),
        //     frameRate: 10,
        //     repeat: -1
        // });
    
        //  Input Events
        this.cursors = this.input.keyboard.createCursorKeys();
        
        //  The score
        this.scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });
    
        //  Collide the player and the stars with the platforms
        //this.physics.add.collider(this.player, this.platforms);
        
        //this.player.anims.play('rutIdle', true);

        // =============================================================
        // --------------------- PATH TESTING --------------------------        
        // =============================================================
        this.p0 = new Phaser.Math.Vector2(280, 350);
        this.p1 = new Phaser.Math.Vector2(375, 350);
        this.p2 = new Phaser.Math.Vector2(580, 350);
        this.p3 = new Phaser.Math.Vector2(280, 470);
        this.p4 = new Phaser.Math.Vector2(445, 470);
        this.p5 = new Phaser.Math.Vector2(580, 470);
        this.testBlock1 = this.add.rectangle(this.p0.x,this.p0.y,4,4,"0x00ff00");
        this.testBlock2 = this.add.rectangle(this.p1.x,this.p1.y,4,4,"0x00ff00");
        this.testBlock3 = this.add.rectangle(this.p2.x,this.p2.y,4,4,"0x00ff00");
        this.testBlock4 = this.add.rectangle(this.p3.x,this.p5.y,4,4,"0x00ff00");
        this.testBlock5 = this.add.rectangle(this.p4.x,this.p5.y,4,4,"0x00ff00");
        this.testBlock6 = this.add.rectangle(this.p5.x,this.p5.y,4,4,"0x00ff00");
        //this.testSprite = this.physics.add.sprite(this.p0.x,this.p0.y,'rut');
        this.person1 = new Person({
                                scene: this,
                                x: this.p0.x,
                                y: this.p0.y,
                                texture: 'rut'});

        this.people.add(this.person1);

        var points = [this.p2,this.p1,this.p4,this.p3,this.p5].reverse();
        this.walkPath(this.person1, points);

    }

    update () {
        if (this.gameOver)
        {
            return;
        }
    
    }



    walkPath (gameObject, points) {
        console.log(points.length);
        if(points.length > 0){
            const next = points.pop();
            this.moveToXY(gameObject, next.x, next.y, 100, 0, points);  
        } else {
            gameObject.body.setVelocityX(0);
            gameObject.body.setVelocityY(0);
        }
    }

    moveToXY (gameObject, x, y, speed, maxTime, points)
    {
        if (speed === undefined) { speed = 60; }
        if (maxTime === undefined) { maxTime = 0; }

        const angle = Math.atan2(y - gameObject.y, x - gameObject.x);
        const dx = gameObject.x - x;
        const dy = gameObject.y - y
        const time = Math.sqrt(dx * dx + dy * dy) / speed * 1000;
        console.log(time);
        // if (maxTime > 0)
        // {
        //     //  We know how many pixels we need to move, but how fast?;
        //     speed = Math.sqrt(dx * dx + dy * dy) / (maxTime / 1000);
        // }
        gameObject.body.setVelocityX((Math.cos(angle) * speed));
        gameObject.body.setVelocityY((Math.sin(angle) * speed));
        console.log("hallo");
        this.time.addEvent({ delay: time, callback: this.walkPath, callbackScope: this, args: [ gameObject, points ] });
    }
    stopMovement(gameObject) {
        gameObject.setVelocityX(0);
        gameObject.setVelocityY(0);
    }

}





