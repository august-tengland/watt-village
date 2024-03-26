// This is the scene in which the player schedules activities for the day

import {DataVisualizer} from '../objects/DataVisualizer.js';


export default class PlannerScene extends Phaser.Scene {


    startKey;
    graphics;
    bitmapTexts = [];
  
    constructor() {
      super({
        key: 'PlannerScene'
      });
    }
  
    init() {
      this.startKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.S
      );
      this.startKey.isDown = false;
      //this.initGlobalDataManager();
    }
  
    create() {  
      
      const element = this.add.dom(400, 600).createFromCache('form');
            
      this.gamezone = this.add.zone(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height);

      this.lineGraphics = this.add.graphics({ x: 0, y: 0 });
      this.buttonGraphics = this.add.graphics({ x: 0, y: 0 });
    
      //  A simple background for our game
      this.plannerBackground = this.add.image(0, 0, 'plannerBackground');
      Phaser.Display.Align.In.Center(this.plannerBackground,this.gamezone);

      this.plannerGround = this.add.rectangle(this.scale.width/2, this.scale.height-62, this.scale.width, 124,"0x351300");
      this.plannerInterface = this.add.image(70, 150,"plannerInterfaceDark");
      this.plannerInterface.setOrigin(0,0);


      this.bigCharacter = this.add.image(0, 0, 'bigRut');
      Phaser.Display.Align.In.Center(this.bigCharacter,this.gamezone, 400,160);

      this.dataVisualizer = new DataVisualizer({scene: this, currentDayKey: "day1"});
      console.log(this.dataVisualizer.energyPrices);
      
      this.lineGraphics = this.add.graphics({ x: 0, y: 0 });
      this.buttonGraphics = this.add.graphics({ x: 0, y: 0 });

      this.activePolygons = ['energyBuy','energySell','solar'];
      this.drawPolygons(this.activePolygons);
      this.graphButtons = this.addGraphButtons();
      this.graphButtonTexts = this.addGraphButtonTexts();
    }
  
    update() {

      //this.graphics.clear();
      //this.drawPolygons(['energyBuy','energySell','solar']);

      if (this.startKey.isDown) {
        this.scene.start('HUDScene');
        this.scene.start('SimulationScene');
        this.scene.bringToTop('HUDScene');
      }
    }

    drawPolygons(activePolygons) {
      const polygonDimensions = {
        offsetX: 607, 
        offsetY: 305, 
        width: 350, 
        height: 622
      } 
      const polygonColors = {
        solar: {
          fill: "0x00aa00",
          line: "0x00aa00"
        }, 
        energyBuy: {
          fill: "0xaaaa00",
          line: "0xaaaa00"
        }, 
        energySell: {
          fill: "0xff7700",
          line: "0xff7700"
        }
      } 

      activePolygons.forEach((polygon) => {
          this.drawPolygon(polygon, polygonColors[polygon], polygonDimensions)
      });
      }
  

    drawPolygon(polygonType, polygonColors, dimensions) {
      const polygon = new Phaser.Geom.Polygon(this.dataVisualizer.getPolygon(polygonType, dimensions));

        //const graphics = this.add.graphics({ x: 0, y: 0 });

        this.lineGraphics.lineStyle(5, polygonColors['fill']);
        this.lineGraphics.fillStyle(polygonColors['fill'],0.5);

        this.lineGraphics.beginPath();

        this.lineGraphics.moveTo(polygon.points[0].x, polygon.points[0].y);

        for (let i = 1; i < polygon.points.length; i++)
        {
          this.lineGraphics.lineTo(polygon.points[i].x, polygon.points[i].y);
        }

        this.lineGraphics.closePath();
        this.lineGraphics.strokePath();
        this.lineGraphics.fillPoints(polygon.points, true);
    }


    addGraphButtons() {
      const graphButtons = new Map(); 
      //const graphButton = this.add.sprite(100,100,'graphButton').setScale(2);
      //graphButtons.set("test",graphButton);
      const buttonBasePosition = {x: 660, y: 208};

      const buttonPositions = {
        solar:            {x: 0, y: 0},
        energyBuy:        {x: 0, y: 30},
        energySell:       {x: 0, y: 60},
        presenceActivity: {x: 200, y: 0},
        idleActivity:     {x: 200, y: 30}
      }
      var testing = 0;
      for (const [graphType, position] of Object.entries(buttonPositions)) {
        testing++;
        const buttonKey = "b1" + graphType;
        graphButtons.set(buttonKey,this.add.sprite(buttonBasePosition.x + position.x,
                                                     buttonBasePosition.y + position.y,
                                                    'graphButtons'));
        graphButtons.get(buttonKey).setFrame(testing);

      }
      return graphButtons;
    }

    

    addGraphButtonTexts() {
      
      const graphButtonTexts = new Map(); 
      const buttonTextBasePosition = {x: 600, y: 200};

      const buttonTexts = {
        solar:            "Solar Production",
        energyBuy:        "Energy Price (Buy)",
        energySell:       "Energy Price (Sell)",
        presenceActivity: "Presence Activity",
        idleActivity:     "Idle Activity",
      }

      const buttonTextPositions = {
        solar:            {x: 0, y: 0},
        energyBuy:        {x: 0, y: 30},
        energySell:       {x: 0, y: 60},
        presenceActivity: {x: 200, y: 0},
        idleActivity:     {x: 200, y: 30}
      }

      for (const [graphType, buttonText] of Object.entries(buttonTexts)) {
        const buttonTextKey = "bt1" + graphType;
        graphButtonTexts.set(buttonTextKey,this.addText(buttonTextBasePosition.x + buttonTextPositions[graphType].x, 
                                                    buttonTextBasePosition.y + buttonTextPositions[graphType].y, 
                                                    buttonText,16));
      }

      return graphButtonTexts;
    }
    
    addText(x, y, value, size = 32) {
      return this.add.text(x, y, value, { fontFamily: 'Inter', fontSize: `${size}px`, fill: '#FFF' });
    }
  
    // initGlobalDataManager() {
    //   this.registry.set('time', 400);
    //   this.registry.set('worldTime', 'WORLD TIME');
    //   this.registry.set('score', 0);
    //   this.registry.set('coins', 0);
    //   this.registry.set('spawn', { x: 12, y: 44, dir: 'down' });
    // }
  }