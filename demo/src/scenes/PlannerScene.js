// This is the scene in which the player schedules activities for the day

import {DataVisualizer} from '../objects/DataVisualizer.js';
import {GraphButton} from '../objects/GraphButton.js';
import GuideScene from './GuideScene.js';


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
      //console.log("when is this called?");
      this.usingGuide = this.registry.get('usingGuide');
      this.guideState = this.registry.get('guideState');
      
      this.data.set("loadingCompleted", false);
      this.data.set("activityTracker", null);
      this.data.set("estimate", null);


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
        dishwasher: "Run Dishwasher",
        morningRoutine: "Morning Routine",
        goToWork: "Commute to Work",
        work: "Work",
        goFromWork: "Commute from Work"
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
      this.currentDay = this.registry.get("currentDay")
      //console.log(this.data.get('activityTracker'));
      this.scene.bringToTop('GuideScene');
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

      this.dataVisualizer = new DataVisualizer({scene: this, currentDayKey: this.currentDay});

      this.schedulerHeaders = this.getSchedulerHeaders();
      this.estimateValueLabel = this.getEstimateLabel(); 

      this.activityTimeSliders = this.getTimeSliders();
      this.activityTimeLabels = this.getActivityTimeLabels(this.activityTimeSliders,this.activityLabels);
      this.activityTimeValueLabels = this.getActivityTimeValueLabels(this.activityTimeSliders,this.activityDurations);

      
      this.activePolygons = this.currentDay === "day1" ? ['energyBuy'] : ['energyBuy','energySell','solar']; //['energyBuy','energySell','solar'];
      this.activeSchemas = ['presenceActivity', 'idleActivity']; //['presenceActivity', 'idleActivity'];
      this.schemaLabels = this.createSchemaLabels(this.activityLabels); // Used to track and add/remove 
      this.graphButtons = this.addGraphButtons();
      this.graphButtonTexts = this.addGraphButtonTexts();
      this.startButton = this.addStartButton();
      this.startErrorMessage = this.addStartErrorMessage(this.startButton);
      this.drawPolygons(this.activePolygons);
      this.drawSchemas(this.activeSchemas);
      this.baseline = this.dataVisualizer.createBaseline(this.data.get("activityTracker"));
      this.events.emit('componentsCreated');
      this.data.set("estimate", this.dataVisualizer.getPredictedSavings(this.data.get('activityTracker'),this.baseline));    
      this.updateEstimateLabel(this.data.get("estimate"));  
      console.log(this.usingGuide);
      console.log(this.guideState);
      if(this.usingGuide && this.guideState === "duringPlanner") {
        console.log("testing");
        this.scene.launch('GuideScene');
        this.scene.bringToTop('GuideScene');
      }
    }
  
    update() {

    }

    // ***********************************************************************
    // -------- HELPER METHODS ----------------------------------------------
    // ***********************************************************************

    // --- On-event callback methods -----------

    handleComponentsCreated() {
      this.data.set("loadingCompleted", true);
    }

    handleSliderChanged(activityKey, value) {
      ////console.log("slider changed:", value, activityKey);
      const activityTracker = this.data.get('activityTracker');
      activityTracker[activityKey].startTime = Math.round(value);
      this.data.set('activityTracker',activityTracker);
    }

    handleActivityTrackerChanged(activityTracker) {
      if (this.data.get("loadingCompleted")) {
        this.activityTimeValueLabels = this.updateActivityTimeValueLabels(
                                                            this.activityTimeSliders, 
                                                            this.activityTimeValueLabels);
        this.lineGraphics.clear();
        this.drawPolygons(this.activePolygons);
        this.drawSchemas(this.activeSchemas);
        this.data.set("estimate", this.dataVisualizer.getPredictedSavings(this.data.get('activityTracker'),this.baseline));    
        this.updateEstimateLabel(this.data.get("estimate"));  
      }
    }

    handleGraphButtonPressed(graphType, isActive) {
      this.lineGraphics.clear();

      if(['solar','energyBuy','energySell'].includes(graphType)) {
        if(isActive) this.activePolygons.push(graphType);
        else this.activePolygons = this.activePolygons.filter((polygonType) => polygonType !== graphType);
        ////console.log(this.activePolygons);
      } 
      else if (['presenceActivity','idleActivity'].includes(graphType)) {
        if(isActive) this.activeSchemas.push(graphType);
        else this.activeSchemas = this.activeSchemas.filter((schemaType) => schemaType !== graphType);
       // //console.log(this.activeSchemas);  
      }  
      else {
        console.error("Couldn't find graphType of pressed button! Type:", graphType);
      }
      this.drawPolygons(this.activePolygons);
      this.drawSchemas(this.activeSchemas);
    }

    attemptSimulationStart() {
    const activityTracker = this.data.get("activityTracker");

      if(this.existsScheduleOverlap(activityTracker)) {
        //console.log("overlap");
        this.startErrorMessage.visible = true;
      } else {
        //console.log("no overlap");
        this.registry.set("activityTracker",activityTracker);
        this.registry.set("baseline",this.baseline);
        //console.log(this);
        this.game.renderer.snapshotArea(608-50, 300-110, 330+70, 624+140,(image) =>
          {
              this.registry.set("currentScheduleImage", image);
              //console.log('snap!');
              this.events.emit('scheduleSnapshotSet');
              this.events.emit('planningDone');
              this.scene.stop("GuideScene");
              this.scene.start('SimulationScene');
          });
        // if(this.usingGuide && this.guideState === "duringPlanner" && currentDay === "day1") // Scuffed
        //   this.registry.set("guideState","afterPlanner");
        // else 
        //   this.registry.set("guideState","inactive");
        //this.scene.stop("GuideScene");
        //this.scene.start('SimulationScene');
      }
    }

    existsScheduleOverlap(activityTracker) {
      var existsOverlap = false;
      const overlapTracker = new Array(24).fill(0);      ;
      const presenceActivites = Object.values(activityTracker).filter(obj => obj.type === "presence"); 
      for (var i = 0; i < presenceActivites.length; i++) {
        //console.log(presenceActivites[i]);
        for (var d = 0; d < presenceActivites[i].duration; d++) {
          const currentTime = (presenceActivites[i].startTime + d % 24);
          //console.log(currentTime);
          if (overlapTracker[currentTime] > 0) {
            existsOverlap = true;
          } else {
            overlapTracker[currentTime] += 1;
          }
        }
      }
      return existsOverlap;
    }



    // --- Creation/Initiation methods -----------


    initActivityTracker() {
      
      const activityTracker = {
        carCharge: {
          type: "idle",
          startTime: null,
          duration: 6
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
          duration: 2
        },
        tv: {
          type: "presence",
          startTime: null,
          duration: 2
        },
        goToWork: {
          type: "presence",
          startTime: 7,
          duration: 1,
        },
        work: {
          type: "presence",
          startTime: 8,
          duration: 8,
        },
        goFromWork: {
          type: "presence",
          startTime: 16,
          duration: 1,
        },
        morningRoutine: {
          type: "presence",
          startTime: 6,
          duration: 1,
        } 
      }
      this.data.set('activityTracker',activityTracker);
    }

    addStartButton() {
      const startButton = this.add.image(290,950,"startButton")
        .setInteractive()
        .on('pointerdown', () => this.attemptSimulationStart() )
        .on('pointerover', () => this.enterStartButtonHoverState())
        .on('pointerout', () => this.enterStartButtonRestState());
      const startButtonLabel = this.addText(0,0,"Start Day",24,"Comic Sans MS");
      Phaser.Display.Align.In.Center(startButtonLabel, startButton);
      return startButton;
    }

    enterStartButtonHoverState() {
      this.startButton.setFrame(1);
    }

    enterStartButtonRestState() {
      this.startButton.setFrame(0);
    }

    addStartErrorMessage(startButton) {
      const errorMessageLabel = this.addText(0,0,"Error: Activities that require\npresence cannot overlap",18);
      errorMessageLabel.setColor("#ff4321");
      errorMessageLabel.setStyle({fontStyle: "bold"});
      errorMessageLabel.visible = false;

      Phaser.Display.Align.To.BottomCenter(errorMessageLabel, startButton,0,5);

      return errorMessageLabel;

    }

    getEstimateLabel() {
      const shEstimate = {
        x: 150, y: 885, fontSize: 24,
        text: "Estimated Savings: ",
        textStyle: "Comic Sans MS"
      }
      const shEstimateLabel = this.addText(shEstimate['x'],
                                            shEstimate['y'],
                                            shEstimate['text'],
                                            shEstimate['fontSize'],
                                            shEstimate['textStyle']);

      const shEstimateValueLabel = this.addText(0,0,"0 sek",
                                                shEstimate['fontSize'],
                                                shEstimate['textStyle'],
                                                "#88FF33");

      Phaser.Display.Align.To.RightCenter(shEstimateValueLabel, shEstimateLabel);                                            
      return shEstimateValueLabel;
    }

    updateEstimateLabel(estimate) {
      this.estimateValueLabel.setText(estimate.toFixed(2)+" sek");
    }


    getSchedulerHeaders() {
      const shBaseOffset = {x: 110, y:190};
      const shHeadersData = {
        shMainHeader: {
          x: 0, y: 0, fontSize: 24,
          text: "Schedule your daily energy activities",
          textStyle: "Comic Sans MS"
        },
        shSubHeader: {
          x: 0, y: 50, fontSize: 18,
          text: "To maximize earnings, try to schedule\nactivities when energy prices are low\nor when you can use your own\nsolar production",
          textStyle: "Comic Sans MS"
        },
        shIdle: {
          x: 0, y: 180, fontSize: 24,
          text: "Activites that can be done remotely",
          textStyle: "Comic Sans MS"
        },
        shActive: {
          x: 0, y: 500, fontSize: 24,
          text: "Activites that require presence",
          textStyle: "Comic Sans MS"
        }
      }
      var schedulerHeaders = new Map();
      for (const [shKey, shValue] of Object.entries(shHeadersData)) {
        schedulerHeaders.set(shKey, this.addText(shValue['x']+shBaseOffset['x'],
                                                shValue['y']+shBaseOffset['y'],
                                                shValue['text'],
                                                shValue['fontSize'],
                                                shValue['textStyle']));
      }

      return schedulerHeaders;
    }


    getTimeSliders() {

      const timeSliders = new Map();

      var sliderBaseOffset = {x: 280, y: 460};
      var sliderBaseValues = {width: 300, height: 5};
      
      var sliderValues = {
        carCharge: {
          activityKey: "carCharge",
          startingValue: 17,
          min: 0,
          max: 23,
          gap: 1
        },
        dishwasher: {
          activityKey: "dishwasher",
          startingValue: 21,
          min: 0,
          max: 23,
          gap: 1
        },
        washingMachine: {
          activityKey: "washingMachine",
          startingValue: 17,
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

      var yOffsets = [0,80,160,310,390];
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
        
        ////console.log(timeSliders.get(sliderKey));                                    
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
            ////console.log("value: ", value);
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
      //console.log(activityTracker);
      
      for (let timeSlider of timeSliders.values()) {
        const activityValueLabelKey = "avl" + timeSlider.name;

        const startTime = activityTracker[timeSlider.name]["startTime"];
        const duration = activityTracker[timeSlider.name]["duration"];
        const timeString = this.convertActivityTimeToDigital(startTime,duration);

        const timeValueLabel = this.addText(0, 0, timeString, 20);
        timeValueLabels.set(activityValueLabelKey, timeValueLabel);
        Phaser.Display.Align.To.RightCenter(timeValueLabel,timeSlider, 10, 0);

      }
      return timeValueLabels;
    }

    updateActivityTimeValueLabels(timeSliders, timeValueLabels) {
      const activityTracker = this.data.get("activityTracker");
      //console.log("testing");
      for (let timeSlider of timeSliders.values()) {
        const activityValueLabelKey = "avl" + timeSlider.name;

        const startTime = activityTracker[timeSlider.name]["startTime"];
        const duration = activityTracker[timeSlider.name]["duration"];
        const timeString = this.convertActivityTimeToDigital(startTime,duration);
        //console.log("activityValueLabelKey:" + activityValueLabelKey);
        //console.log("startTime:" + startTime);
        //console.log("duration:" + duration);
        //console.log("activityTracker:", activityTracker);
        //console.log("timeString:" + timeString);
        timeValueLabels.get(activityValueLabelKey).setText(timeString);
      }
      return timeValueLabels;
    }


    convertActivityTimeToDigital(startTime, duration){
      
      var endTime = (startTime + duration) % 24;
      if (startTime < 10) startTime = "0" + startTime;
      var start = startTime + ":00";
      if (endTime < 10) endTime = "0" + endTime;
      var end = endTime + ":00";
      //console.log(start,end);
      return start+" -\n"+end;
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
      ////console.log("activity tracker:", activityTrackingData);

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
      ////console.log("schedule:",schedules);

      this.schemaLabels.values().forEach((textLabel) => {
        textLabel.visible = false;
      });

      activeSchemas.sort().forEach((schema) => {
        ////console.log("drawSchema:", schema);
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
      ////console.log(schemaLabelKey);
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

      const isDisabled = {
        day1: ['solar','energySell'],
        day2: [],
        day3: [],
        day4: []
      }

      for (const [graphType, position] of Object.entries(buttonPositions)) {
        const buttonKey = "b1" + graphType;
        //(isDisabled[this.currentDay]);
        //console.log(isDisabled[this.currentDay].includes(buttonKey));
        graphButtons.set(buttonKey,new GraphButton({key: buttonKey,
                                                    graphKey: graphType,
                                                    x: (buttonBasePosition.x + position.x),
                                                    y: (buttonBasePosition.y + position.y),
                                                    scene: this,
                                                    texture: 'graphButtons',
                                                    isDisabled: isDisabled[this.currentDay].includes(graphType) ? true : false, 
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
        presenceActivity: "Presence Activities",
        idleActivity:     "Remote Activities",
      }

      const buttonTextPositions = {
        solar:            {x: 0, y: 0},
        energyBuy:        {x: 0, y: 30},
        energySell:       {x: 0, y: 60},
        presenceActivity: {x: 200, y: 0},
        idleActivity:     {x: 200, y: 30}
      }

      const isDisabled = {
        day1: ['solar','energySell'],
        day2: [],
        day3: [],
        day4: []
      }

      for (const [graphType, buttonText] of Object.entries(buttonTexts)) {
        const buttonTextKey = "bt1" + graphType;
        const textColor = isDisabled[this.currentDay].includes(graphType) ? "#666666" : "#FFFFFF";
        graphButtonTexts.set(buttonTextKey,this.addText(buttonTextBasePosition.x + buttonTextPositions[graphType].x, 
                                                    buttonTextBasePosition.y + buttonTextPositions[graphType].y, 
                                                    buttonText,16, 'arial', textColor));
      }

      return graphButtonTexts;
    }
    
    addText(x, y, value, size = 32, fontFamily = 'arial', fill='#FFF') {
      return this.add.text(x, y, value, { fontFamily: fontFamily, fontSize: `${size}px`, fill: fill });
    }
  

  }