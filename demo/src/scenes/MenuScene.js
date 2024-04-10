export default class MenuScene extends Phaser.Scene {
    startKey;
    bitmapTexts = [];
  
    constructor() {
      super({
        key: 'MenuScene'
      });
    }
  
    init() {
      this.startKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.S
      );
      this.startKey.isDown = false;
    }
  
    create() {  

      this.gamezone = this.add.zone(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height);
    
      //  A simple background for our game
      this.sky = this.add.image(0, 0, 'sky');
      this.sky.setTint(0x169ac5,0x169ac5,0x9addf3,0x9addf3);

      //  The platforms group contains the ground and the 2 ledges we can jump on
      this.platforms = this.physics.add.staticGroup();
    
      //  Here we create the ground.
      this.ground = this.platforms.create(0, 0, 'ground').setScale(7).refreshBody();
      Phaser.Display.Align.In.BottomCenter(this.ground,this.gamezone);

      Phaser.Display.Align.In.Center(this.sky,this.gamezone);

      this.logo = this.add.image(0,0,"wattVillageLogo").setDepth(10);
      Phaser.Display.Align.In.Center(this.logo,this.gamezone, 0, -150);


      this.playButton = this.createPlayButton();
      this.playLevelButtons = this.createPlayLevelButtons();


      //  Input Events
      this.cursors = this.input.keyboard.createCursorKeys();
    }
  
    update() {
      if (this.startKey.isDown) {
        this.registry.set("currentDay", "day3");

        this.scene.start('HUDScene');
        this.scene.start('PlannerScene');
        this.scene.bringToTop('HUDScene');
      }
    }

    createPlayButton() {

      const playButton = this.add.image(0,0,"menuPlayButton").setDepth(8)
                          .setInteractive()
                          .on('pointerdown', () => this.startGame(0))
                          .on('pointerover', () => this.enterPlayButtonHoverState("btn0"))
                          .on('pointerout', () => this.enterPlayButtonRestState("btn0"));

      const playButtonDescriptor = this.addText(0,0,"Complete Playthrough",20);
      const playButtonLabel = this.addText(0,0,"Play").setDepth(10);

      Phaser.Display.Align.To.BottomCenter(playButton,this.logo, 0, 100);
      Phaser.Display.Align.To.TopCenter(playButtonDescriptor, playButton, 0, 10);
      Phaser.Display.Align.In.Center(playButtonLabel, playButton, 0, 0);

      return playButton;
    }

    createPlayLevelButtons() {
      const playLevelButtons = new Map();
      const playLevelButtonLabels = new Map();

      const margin = 20;
      const offset = -1 * (98*1.5 + margin*1.5);
      for (var level = 1; level <= 4; level++) {
        const btnKey = "btn"+level;
        const btnLevel = level;
        playLevelButtons.set(btnKey, this.add.image(0,0,"menuPlayLevelButton").setDepth(8)
                                    .setInteractive()
                                    .on('pointerdown', () => this.startGame(btnLevel))
                                    .on('pointerover', () => this.enterPlayButtonHoverState(btnKey))
                                    .on('pointerout', () => this.enterPlayButtonRestState(btnKey)));
        
        playLevelButtonLabels.set(btnKey,this.addText(0,0,level).setDepth(10));

        if(level == 1) Phaser.Display.Align.To.BottomCenter(playLevelButtons.get(btnKey),this.playButton, offset, 80);
        else Phaser.Display.Align.To.RightCenter(playLevelButtons.get(btnKey),playLevelButtons.get("btn"+(level-1)), margin, 0);
        Phaser.Display.Align.In.Center(playLevelButtonLabels.get(btnKey), playLevelButtons.get(btnKey), 0, 0);
      }

      const playLevelButtonDescriptor = this.addText(0,0,"Play a Specific Level",20);
      Phaser.Display.Align.To.TopCenter(playLevelButtonDescriptor, playLevelButtons.get("btn1"), -offset, 10);

      return playLevelButtons;
    }

    enterPlayButtonHoverState(buttonId) {
      console.log(buttonId);
      if(buttonId === "btn0") {
        this.playButton.setTint(0x169ac5,0x169ac5,0x9addf3,0x9addf3);
      } else {
        this.playLevelButtons.get(buttonId).setTint(0x169ac5,0x169ac5,0x9addf3,0x9addf3);
      }
    } 

    enterPlayButtonRestState(buttonId) {
      if(buttonId === "btn0") {
        this.playButton.clearTint();
      } else {
        this.playLevelButtons.get(buttonId).clearTint();
      }
    }


    startGame(level) {
      var currentDay = null;
      var guide = level == 0 ? true : false;

      if(level == 0 || level == 1) {
        currentDay = "day1";
      } else if (level == 2) {
        currentDay = "day2";
      } else if (level == 3) {
        currentDay = "day3";
      } else if (level == 4) {
        currentDay = "day4";
      } else {
        console.error("invalid level value!");
      }

      this.registry.set("currentDay", currentDay);
      this.registry.set("usingGuide", guide);
      this.registry.set("runGuide", guide);


      this.scene.start('HUDScene');
      if(guide) this.scene.start('SimulationScene');
      else this.scene.start('PlannerScene');
      this.scene.bringToTop('HUDScene');
      this.scene.stop('MenuScene');
    }

    addText(x, y, value, size = 32, fontFamily = 'Comic Sans MS', fill='#FFF') {
      return this.add.text(x, y, value, { fontFamily: fontFamily, fontSize: `${size}px`, fill: fill });
    }
  }