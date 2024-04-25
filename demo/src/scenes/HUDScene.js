export default class HUDScene extends Phaser.Scene {
    
    textElements;
  
    constructor() {
      super({
        key: 'HUDScene'
      });
    }
    
  
    create() {

    
    this.planningDone = false;
    this.scheduleSnapshot = null;

    this.gamezone = this.add.zone(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height);

    this.HUDIndividualStats = this.add.image(20, 20, 'HUDIndividualStats');
    this.HUDIndividualStats.setOrigin(0,0);

    this.HUDCommunityStats = this.add.image(20, 20, 'HUDCommunityStats');
    this.HUDCommunityStats.setOrigin(0,0);
    Phaser.Display.Align.To.RightCenter(this.HUDCommunityStats,this.HUDIndividualStats, 20);


    this.HUDEnergyPrices = this.add.image(20, 20, 'HUDEnergyPrices');
    this.HUDEnergyPrices.setOrigin(0,0);
    Phaser.Display.Align.To.RightCenter(this.HUDEnergyPrices,this.HUDCommunityStats, 20);

    this.HUDGoal = this.add.image(20, 20, 'HUDGoal');
    this.HUDGoal.setOrigin(0,0);
    Phaser.Display.Align.To.RightCenter(this.HUDGoal,this.HUDEnergyPrices, 20);
    
    //this.HUDSolarProduction = this.add.image(20, 20, 'HUDSolarProduction');
    //this.HUDSolarProduction.setOrigin(0,0);
    //Phaser.Display.Align.To.RightCenter(this.HUDSolarProduction,this.HUDEnergyPrices, 20);

    this.HUDTime = this.add.sprite(180,80,"HUDTime");
    this.HUDTime.setOrigin(0,0);
    Phaser.Display.Align.In.TopRight(this.HUDTime,this.gamezone, -20,-20);

    this.labelTextElements = new Map([
        ['time', this.addText(1800, 100, 'Time',24)],
        ['currentIndividualStats', this.addText(0, 0, 'Individual\nStats (sek)',18)],
        ['currentTotalStats', this.addText(0, 0, 'Community\nStats (sek)',18)],
        ['currentEnergyPrices', this.addText(0, 0, 'Energy\nPrices',18)],
        ['goal', this.addText(0, 0, "Today's\nGoal",18)],
        //['currentSolarProduction', this.addText(0, 0, 'Solar\nProduction',18)]
    ]);

    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentIndividualStats'),this.HUDIndividualStats, -70);
    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentTotalStats'),this.HUDCommunityStats, -80);
    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentEnergyPrices'),this.HUDEnergyPrices, -70);
    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('goal'),this.HUDGoal, -70);
    //Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentSolarProduction'),this.HUDSolarProduction, -60);
    Phaser.Display.Align.In.TopCenter(this.labelTextElements.get('time'),this.HUDTime, -2, -20);



    this.valueTextElements = new Map([
        ['time', this.addText(50, 450, '00:00',24)],
        ['currentIndividualStatsBuy', this.addText(0, 200, '0.00',20)],
        ['currentIndividualStatsSell', this.addText(0, 200, '0.00',20)],
        ['currentIndividualStatsSave', this.addText(0, 200, '0.00',20)],
        ['currentTotalStatsBuy', this.addText(0, 200, '0.00',20)],
        ['currentTotalStatsSell', this.addText(0, 200, '0.00',20)],
        ['currentTotalStatsSave', this.addText(0, 200, '0.00',20)],
        ['goal', this.addText(0, 200, 'Save\n100 sek',20,"#88FF33")],
        //['currentEnergyPrices', this.addText(0, 200, '0.00/0.00',20)],
        //['currentSolarProduction', this.addText(0, 200, '0.00/0.00',20)],
    ]);

    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentIndividualStatsBuy'),this.HUDIndividualStats, -225);
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentIndividualStatsSell'),this.HUDIndividualStats, -335);
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentIndividualStatsSave'),this.HUDIndividualStats, -455);
    
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentTotalStatsBuy'),this.HUDCommunityStats, -237);
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentTotalStatsSell'),this.HUDCommunityStats, -346);
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentTotalStatsSave'),this.HUDCommunityStats, -467);
    
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('goal'),this.HUDGoal, -170);
    
    //Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentEnergyPrices'),this.HUDEnergyPrices, -180);

    this.energyPriceValues = this.createEnergyPriceValues();
    
   // Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentSolarProduction'),this.HUDSolarProduction, -180);
    
    Phaser.Display.Align.In.TopCenter(this.valueTextElements.get('time'),this.HUDTime, 0, -55);

    this.scheduleButton = this.createScheduleButton();

      // create events
      const simulation = this.scene.get('SimulationScene');
      const planner = this.scene.get('PlannerScene');
      simulation.events.on('timeChanged', this.updateTime, this);
      simulation.events.on('individualStatsChanged', this.updateIndividualStats, this);
      simulation.events.on('totalStatsChanged', this.updateTotalStats, this);
      //simulation.events.on('currentProductionChanged', this.updateCurrentSolarProduction, this);
      simulation.events.on('currentEnergyPricesChanged', this.updateEnergyPrices, this);
      simulation.events.on('gamePausedChanged', this.updateTimeHud, this);

      planner.events.on('scheduleSnapshotSet', this.createScheduleSnapshot, this);
      planner.events.on('planningDone', this.setPlanningDone, this);

      this.dailyGoal = this.fetchDailyGoal(this.registry.get("currentDay"));
      this.updateGoalHud(this.dailyGoal);
      this.registry.set('dailyGoal',this.dailyGoal);

    }

    fetchDailyGoal(currentDayKey) {
      const json = this.cache.json.get('dailyGoalsJSON');
      const dailyGoalData = json[currentDayKey];
      return dailyGoalData;
    }

    createEnergyPriceValues() {
      
      const energyPriceValues = new Map();
      
      energyPriceValues.set('base', this.add.rectangle(0,0,120,20,0x0A447A).setOrigin(0,0));
      energyPriceValues.set('buy', this.add.rectangle(0,0,12,10,0xFFFF00).setOrigin(0,0).setAlpha(0.7));
      energyPriceValues.set('sell', this.add.rectangle(0,0,12,10,0xFFCC00).setOrigin(0,0).setAlpha(0.7));
      energyPriceValues.set('buyLabel', this.addText(0, 0, 'buy',16))
      energyPriceValues.set('sellLabel', this.addText(0, 0, 'sell',16))
      
      Phaser.Display.Align.In.LeftCenter(energyPriceValues.get('base'),this.HUDEnergyPrices, -160);
      Phaser.Display.Align.In.TopLeft(energyPriceValues.get('buy'),energyPriceValues.get('base'));
      Phaser.Display.Align.In.BottomLeft(energyPriceValues.get('sell'),energyPriceValues.get('base'));
      Phaser.Display.Align.To.TopLeft(energyPriceValues.get('buyLabel'),energyPriceValues.get('base'),0,0);
      Phaser.Display.Align.To.BottomLeft(energyPriceValues.get('sellLabel'),energyPriceValues.get('base'),0,0);

      return energyPriceValues;
    }
  
    addText(x, y, value, size = 32, fill ="#FFF") {
      return this.add.text(x, y, value, { fontFamily: 'Comic Sans MS', fontSize: `${size}px`, fill: fill });
    }
  
    updateTime(time) {
      var digitalTime = this.convertTimeUnitsToDigital(time);
      this.valueTextElements.get('time').setText(`${digitalTime['hour']}:${digitalTime['minute']}`);
    }
    updateTimeHud(isPaused, isSpedup) {
      if (isPaused){
        this.HUDTime.setFrame(0)
      } else {
        if(isSpedup)
          this.HUDTime.setFrame(2)
        else 
          this.HUDTime.setFrame(1)
      }
    }

    createScheduleButton() {
      const scheduleButton = {};
      scheduleButton['button'] = this.add.image(0,0,"guideNextButton")
        .setInteractive()
        .on('pointerdown', () => this.toggleScheduleVisible())
        .on('pointerover', () => this.enterScheduleButtonHoverState())
        .on('pointerout', () => this.enterScheduleButtonRestState())
        .setOrigin(0).setDepth(125).setAlpha(0);
      
      scheduleButton['Value'] = false;
      scheduleButton['label'] = this.addText(0,0,"View Schedule",20,"#ffffff","Arial","Bold").setOrigin(0).setDepth(130).setAlpha(0);
      
      Phaser.Display.Align.To.BottomLeft(scheduleButton['button'],this.HUDIndividualStats,0,20);
      Phaser.Display.Align.In.Center(scheduleButton['label'],scheduleButton['button']);
      
      return scheduleButton;
    }

    toggleScheduleVisible() {
      this.scheduleButton['Value'] = !this.scheduleButton['Value'];
      if(this.scheduleButton['Value']) {
        this.snapImage.setAlpha(1);
        this.scheduleButton['label'].setText("Hide Schedule");
      }
      else {
        this.snapImage.setAlpha(0);
        this.scheduleButton['label'].setText("Show Schedule");
      }
    }

    enterScheduleButtonHoverState() {
      this.scheduleButton['button'].setTint(0x169ac5,0x169ac5,0x9addf3,0x9addf3);
    }

    enterScheduleButtonRestState() {
        this.scheduleButton['button'].clearTint();
    }

    createScheduleSnapshot() {
      const scheduleImage = this.registry.get("currentScheduleImage");
      console.log(this.textures);
      if(this.textures.exists('snap')) {
        const snap = this.textures.get('snap');
        snap.clear();
        snap.draw(0, 0, scheduleImage);
      } else {
        const snap = this.textures.createCanvas ('snap', scheduleImage.width, scheduleImage.height);
        snap.draw(0, 0, scheduleImage);
      }
      this.snapImage = this.add.image(300, 200, 'snap').setOrigin(0).setAlpha(0);
      Phaser.Display.Align.To.BottomLeft(this.snapImage,this.scheduleButton['button'],0,20);
    }

    setPlanningDone() {
      this.planningDone = true;
      this.scheduleButton['button'].setAlpha(1);
      this.scheduleButton['label'].setAlpha(1);
    }
 
    updateGoalHud(goal) {
      this.valueTextElements.get('goal').setText(`Save\n${goal} sek`);
    }

    updateIndividualStats(individualCost, individualSelling, individualSavings){
        this.valueTextElements.get('currentIndividualStatsBuy').setText(`${individualCost.toFixed(2)}`);
        this.valueTextElements.get('currentIndividualStatsSell').setText(`${individualSelling.toFixed(2)}`);
        this.valueTextElements.get('currentIndividualStatsSave').setText(`${individualSavings.toFixed(2)}`);

    }
    updateTotalStats(totalCost, totalSelling, totalSavings){
      this.valueTextElements.get('currentTotalStatsBuy').setText(`${totalCost.toFixed(2)}`);
      this.valueTextElements.get('currentTotalStatsSell').setText(`${totalSelling.toFixed(2)}`);
      this.valueTextElements.get('currentTotalStatsSave').setText(`${totalSavings.toFixed(2)}`);
    }
    updateCurrentSolarProduction(currentProduction, maxCapacity) {
        // Note: Present data as production in kW/h, not kW/timeUnit
      this.valueTextElements.get('currentSolarProduction').setText(`${currentProduction.toFixed(2)}/${maxCapacity.toFixed(2)}`);
    }
    //updateEnergyPrices(currentBuyingPrice, currentSellingPrice) {
        // Note: Present data as production in kW/h, not kW/timeUnit
    //  this.valueTextElements.get('currentEnergyPrices').setText(`${currentBuyingPrice.toFixed(2)}/${currentSellingPrice.toFixed(2)}`);
    //}

    updateEnergyPrices(currentBuyingPrice, currentSellingPrice) {
      // Note: Present data as production in kW/h, not kW/timeUnit
      const maxWidth = 120;
      const maxPrice = 1.20;
      this.energyPriceValues.get('buy').width = maxWidth * (currentBuyingPrice/maxPrice);
      this.energyPriceValues.get('sell').width = maxWidth * (currentSellingPrice/maxPrice);
  }

    convertTimeUnitsToDigital(time){
        var dayLength = this.registry.values.dayLength;
        var tucf = dayLength / 24;
        time = time % (dayLength);
        var hour = Math.floor(time/tucf);
        var minute = Math.round((time/tucf - hour) * 60);
        var hourString = hour.toString().padStart(2, '0');
        var minuteString = minute.toString().padStart(2, '0');

        return {"hour": hourString, "minute": minuteString};
    }
  }