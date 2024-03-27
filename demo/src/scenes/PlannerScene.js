// This is the scene in which the player schedules activities for the day

import {DataVisualizer} from '../objects/DataVisualizer.js';
import {GraphButton} from '../objects/GraphButton.js';


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

      this.graphDimensions = {
        offsetX: 608, 
        offsetY: 300, 
        width: 330, 
        height: 624
      }

      this.activityLabels = {
        carCharge: "Charge Electric Car",
        dinner: "Make Dinner",
        tv: "Watch TV",
        washingMachine: "Run Washing Machine",
        dishwasher: "Run Dishwasher"
      }
      
    }

    preload() {
      this.load.scenePlugin({
        key: 'rexuiplugin',
        url: 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexuiplugin.min.js',
        sceneKey: 'rexUI'
      });
    }
  
    create() {  
      // --- EVENT LISTENERS ----------------
      this.events.on('graphButtonPressed', this.handleGraphButtonPressed, this);
      this.events.on('sliderChanged', this.handleSliderChanged, this);
      this.events.on('componentsCreated', this.handleComponentsCreated, this);
      this.events.on('changedata-activityTracker', this.handleActivityTrackerChanged, this);

      // --- SCENE CREATION ----------------
            
      this.gamezone = this.add.zone(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height);

      
      // --- Background and containers ---
      this.plannerBackground = this.add.image(0, 0, 'plannerBackground');
      Phaser.Display.Align.In.Center(this.plannerBackground,this.gamezone);

      this.plannerGround = this.add.rectangle(this.scale.width/2, this.scale.height-62, this.scale.width, 124,"0x351300");
      this.plannerInterface = this.add.image(70, 150,"plannerInterfaceDark");
      this.plannerInterface.setOrigin(0,0);

      this.bigCharacter = this.add.image(0, 0, 'bigRut');
      Phaser.Display.Align.In.Center(this.bigCharacter,this.gamezone, 400,160);

      // --- Content ---
      
      this.lineGraphics = this.add.graphics({ x: 0, y: 0 });
      this.buttonGraphics = this.add.graphics({ x: 0, y: 0 });

      this.initActivityTracker();

      this.activityTimeSliders = this.getTimeSliders();
      this.activityTimeLabels = this.getActivityTimeLabels(this.activityTimeSliders,this.activityLabels);
      this.activityTimeValueLabels = this.getActivityTimeValueLabels(this.activityTimeSliders,this.activityDurations);


      this.dataVisualizer = new DataVisualizer({scene: this, currentDayKey: "day1"});
      //console.log(this.dataVisualizer.energyPrices);

      this.activePolygons = ['energyBuy','energySell','solar']; //['energyBuy','energySell','solar'];
      this.activeSchemas = ['presenceActivity', 'idleActivity']; //['presenceActivity', 'idleActivity'];
      this.schemaLabels = this.createSchemaLabels(this.activityLabels); // Used to track and add/remove 
      this.graphButtons = this.addGraphButtons();
      this.graphButtonTexts = this.addGraphButtonTexts();
      this.drawPolygons(this.activePolygons);
      this.drawSchemas(this.activeSchemas);
      this.events.emit('componentsCreated');

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

    // ***********************************************************************
    // -------- HELPER METHODS ----------------------------------------------
    // ***********************************************************************

    // --- On-event callback methods -----------

    handleComponentsCreated() {
      this.data.set("loadingCompleted", true);
    }

    handleSliderChanged(activityKey, value) {
      //console.log("slider changed:", value, activityKey);
      const activityTracker = this.data.get('activityTracker');
      activityTracker[activityKey].startTime = value;
      this.data.set('activityTracker',activityTracker);
      //this.activityTracker[activityKey].startTime = value;
    }

    handleActivityTrackerChanged(activityTracker) {
      if (this.data.get("loadingCompleted")) {
        
        this.lineGraphics.clear();
        this.drawPolygons(this.activePolygons);
        this.drawSchemas(this.activeSchemas);
      }
    }

    handleGraphButtonPressed(graphType, isActive) {
      this.lineGraphics.clear();

      if(['solar','energyBuy','energySell'].includes(graphType)) {
        if(isActive) this.activePolygons.push(graphType);
        else this.activePolygons = this.activePolygons.filter((polygonType) => polygonType !== graphType);
        //console.log(this.activePolygons);
      } 
      else if (['presenceActivity','idleActivity'].includes(graphType)) {
        if(isActive) this.activeSchemas.push(graphType);
        else this.activeSchemas = this.activeSchemas.filter((schemaType) => schemaType !== graphType);
       // console.log(this.activeSchemas);  
      }  
      else {
        console.error("Couldn't find graphType of pressed button! Type:", graphType);
      }
      this.drawPolygons(this.activePolygons);
      this.drawSchemas(this.activeSchemas);
    }


    // --- Creation/Initiation methods -----------


    initActivityTracker() {
      
      const activityTracker = {
        carCharge: {
          type: "idle",
          startTime: null,
          duration: 3
        },
        washingMachine: {
          type: "idle",
          startTime: null,
          duration: 1
        },
        dishwasher: {
          type: "idle",
          startTime: null,
          duration: 1
        },
        dinner: {
          type: "presence",
          startTime: null,
          duration: 1
        },
        tv: {
          type: "presence",
          startTime: null,
          duration: 2
        }
      }
      this.data.set('activityTracker',activityTracker);
    }


    getTimeSliders() {

      const timeSliders = new Map();

      var sliderBaseOffset = {x: 280, y: 400};
      var sliderBaseValues = {width: 300, height: 5};
      
      var sliderValues = {
        carCharge: {
          activityKey: "carCharge",
          startingValue: 2,
          min: 0,
          max: 23,
          gap: 1
        },
        dishwasher: {
          activityKey: "dishwasher",
          startingValue: 10,
          min: 0,
          max: 23,
          gap: 1
        },
        washingMachine: {
          activityKey: "washingMachine",
          startingValue: 18,
          min: 0,
          max: 23,
          gap: 1
        },
        dinner: {
          activityKey: "dinner",
          startingValue: 17,
          min: 17,
          max: 22,
          gap: 1
        },
        tv: {
          activityKey: "tv",
          startingValue: 19,
          min: 17,
          max: 22,
          gap: 1
        }
      };

      var yOffsets = [0,100,200,380,480];
      var yOffsetPointer = 0;
      for (const [sliderKey, sliderValue] of Object.entries(sliderValues)) {
        timeSliders.set(sliderKey, this.getSlider({
                                              activityKey: sliderValue['activityKey'], 
                                              startingValue: sliderValue['startingValue'], 
                                              x: sliderBaseOffset['x'],
                                              y: sliderBaseOffset['y']+yOffsets[yOffsetPointer],
                                              width: sliderBaseValues['width'],
                                              height: sliderBaseValues['height'],
                                              min: sliderValue['min'],
                                              max: sliderValue['max'],
                                              gap: sliderValue['gap'],
                                              scene: this}));
        
        //console.log(timeSliders.get(sliderKey));                                    
        yOffsetPointer++;
      }

      return timeSliders;

    }

    getSlider(params) {
      var range = params.max - params.min;
      return this.rexUI.add.slider({
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
        orientation: 'x',
        name: params.activityKey,

        track: this.rexUI.add.roundRectangle(0, 0, 0, 0, 6, 0x00407A),
        thumb: this.rexUI.add.roundRectangle(0, 0, 0, 0, 10, 0xFFFFFF),

        value: (params.startingValue-params.min) / range,

        valuechangeCallback: (value) => {
            //console.log("value: ", value);
            value = (value * range) + params.min;
            params.scene.events.emit('sliderChanged', params.activityKey, value);
        },
        gap: params.gap / range,

        space: {
            top: 4,
            bottom: 4
        },
        input: 'drag', // 'drag'|'click'
      })
      .layout();
    }

    getActivityTimeLabels(timeSliders, activityLabels) {
      const timeLabels = new Map();
      
      for (let timeSlider of timeSliders.values()) {
        const activityLabelKey = "al" + timeSlider.name;
        const timeLabel = this.addText(0, 0, activityLabels[timeSlider.name], 20);
        timeLabels.set(activityLabelKey, timeLabel);
        Phaser.Display.Align.To.TopLeft(timeLabel,timeSlider, 0, 10);

      }
      return timeLabels;
    }

    getActivityTimeValueLabels(timeSliders) {
      const timeValueLabels = new Map();
      const activityTracker = this.data.get("activityTracker");
      console.log(activityTracker);
      
      for (let timeSlider of timeSliders.values()) {
        const activityValueLabelKey = "avl" + timeSlider.name;

        const startTime = activityTracker[timeSlider.name]["startTime"];
        const duration = activityTracker[timeSlider.name]["duration"];
        const timeString = this.convertActivityTimeToDigital(startTime,duration);

        const timeValueLabel = this.addText(0, 0, "18:00 -\n19:00", 20);
        timeValueLabels.set(activityValueLabelKey, timeValueLabel);
        Phaser.Display.Align.To.RightCenter(timeValueLabel,timeSlider, 10, 0);

      }
      return timeValueLabels;
    }

    convertActivityTimeToDigital(startTime, duration){
      console.log(startTime,duration);
      // var dayLength = this.registry.values.dayLength;
      // var tucf = dayLength / 24;
      // var hour = Math.floor(time/tucf);
      // var minute = Math.round((time/tucf - hour) * 60);
      // var hourString = hour.toString().padStart(2, '0');
      // var minuteString = minute.toString().padStart(2, '0');

      // return {"hour": hourString, "minute": minuteString};
  }




    drawPolygons(activePolygons) {


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

      activePolygons.sort().forEach((polygon) => {
          this.drawPolygon(polygon, polygonColors[polygon], this.graphDimensions)
      });
      }
  

    drawSchemas(activeSchemas) {

      const schemaColors = {
        presenceActivity: {
          fill: "0x8F00FF",
          line: "0x8F00FF"
        }, 
        idleActivity: {
          fill: "0x0078E7",
          line: "0x0078E7"
        }
      } 

      const activityTrackingData = this.data.get("activityTracker");
      //console.log("activity tracker:", activityTrackingData);

      const schedules = {
        presenceActivity: {},
        idleActivity: {}
      };

      for(const [activityKey, activityValues] of Object.entries(activityTrackingData)) {
        if(activityValues['type'] === 'idle') {
          schedules['idleActivity'][activityKey] = {};
          schedules['idleActivity'][activityKey]['start'] = activityValues['startTime'];
          schedules['idleActivity'][activityKey]['end'] = activityValues['startTime']+activityValues['duration'];
        }
        else if (activityValues['type'] === 'presence') {
          schedules['presenceActivity'][activityKey] = {};
          schedules['presenceActivity'][activityKey]['start'] = activityValues['startTime'];
          schedules['presenceActivity'][activityKey]['end'] = activityValues['startTime']+activityValues['duration'];
        }
        else {
          console.error("Supplied activity type does not exist! Type:", activityValues['type']);
        }
      }
      //console.log("schedule:",schedules);

      this.schemaLabels.values().forEach((textLabel) => {
        textLabel.visible = false;
      });

      activeSchemas.sort().forEach((schema) => {
        //console.log("drawSchema:", schema);
        this.drawSchema(schema, schemaColors[schema], schedules[schema], this.graphDimensions);
          //this.drawPolygon(polygon, polygonColors[polygon], polygonDimensions)
      });
      }
  

    drawPolygon(polygonType, polygonColors, dimensions) {

      const polygon = new Phaser.Geom.Polygon(this.dataVisualizer.getPolygon(polygonType, dimensions));
      this.strokeAndFillPolygonPath(polygon,polygonColors['line'],polygonColors['fill']);
    }

    drawSchema(schemaType, schemaColors, schedule, dimensions) {

      var response = this.dataVisualizer.getSchemaSquares(schemaType, schedule ,dimensions);
      var schemaSquares = response[0];
      var squareMidpoints = response[1];
      schemaSquares.forEach((schemaSquareData) =>{
        const schemaSquare = new Phaser.Geom.Polygon(schemaSquareData);
        this.strokeAndFillPolygonPath(schemaSquare, schemaColors['line'], schemaColors['fill']);
      });
      squareMidpoints.forEach(midpoint => {
        this.updateSchemaLabels(midpoint);
      });
    }

    createSchemaLabels(labels) {
      const schemaLabels = new Map(); 
      for (const [labelKey, labelValue] of Object.entries(labels)) {
        schemaLabels.set(labelKey, this.addText(0,0,labelValue,16));
        schemaLabels.get(labelKey).setOrigin(0.5,0.5);
        schemaLabels.get(labelKey).visible = false;

        schemaLabels.set(labelKey+"Duplicate", this.addText(0,0,labelValue,16));
        schemaLabels.get(labelKey+"Duplicate").setOrigin(0.5,0.5);
        schemaLabels.get(labelKey+"Duplicate").visible = false;
      }
      return schemaLabels;
    }

    updateSchemaLabels(midpoint) {
      var schemaLabelKey = midpoint['activityKey'];
      if (midpoint['isDuplicate']) schemaLabelKey += "Duplicate";
      //console.log(schemaLabelKey);
      this.schemaLabels.get(schemaLabelKey).visible = true;
      this.schemaLabels.get(schemaLabelKey).x = midpoint['x'];
      this.schemaLabels.get(schemaLabelKey).y = midpoint['y'];      
    }

    strokeAndFillPolygonPath(polygon, strokeStyle, fillStyle) {
      this.lineGraphics.lineStyle(3, strokeStyle);
      this.lineGraphics.fillStyle(fillStyle,0.5);

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
      const buttonStartingFrameNumbers = {
        solar:            2,
        energyBuy:        4,
        energySell:       6,
        presenceActivity: 10,
        idleActivity:     8
      }

      for (const [graphType, position] of Object.entries(buttonPositions)) {
        const buttonKey = "b1" + graphType;
        graphButtons.set(buttonKey,new GraphButton({key: buttonKey,
                                                    graphKey: graphType,
                                                    x: (buttonBasePosition.x + position.x),
                                                    y: (buttonBasePosition.y + position.y),
                                                    scene: this,
                                                    texture: 'graphButtons',
                                                    startingFrameNumber: buttonStartingFrameNumbers[graphType]}).
                                                    setInteractive());
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
      return this.add.text(x, y, value, { fontFamily: 'arial', fontSize: `${size}px`, fill: '#FFF' });
    }
  

  }