export default class HUDScene extends Phaser.Scene {
    
    textElements;
  
    constructor() {
      super({
        key: 'HUDScene'
      });
    }
    
  
    create() {

    this.HUDIndividualStats = this.add.image(20, 20, 'HUDIndividualStats');
    this.HUDIndividualStats.setOrigin(0,0);

    this.HUDCommunityStats = this.add.image(20, 20, 'HUDCommunityStats');
    this.HUDCommunityStats.setOrigin(0,0);
    Phaser.Display.Align.To.RightCenter(this.HUDCommunityStats,this.HUDIndividualStats, 20);


    this.HUDEnergyPrices = this.add.image(20, 20, 'HUDEnergyPrices');
    this.HUDEnergyPrices.setOrigin(0,0);
    Phaser.Display.Align.To.RightCenter(this.HUDEnergyPrices,this.HUDCommunityStats, 20);


    this.HUDSolarProduction = this.add.image(20, 20, 'HUDSolarProduction');
    this.HUDSolarProduction.setOrigin(0,0);
    Phaser.Display.Align.To.RightCenter(this.HUDSolarProduction,this.HUDEnergyPrices, 20);

    this.labelTextElements = new Map([
        ['time', this.addText(1800, 100, 'Time',24)],
        ['currentIndividualStats', this.addText(0, 0, 'Individual\nStats',18)],
        ['currentTotalStats', this.addText(0, 0, 'Community\nStats',18)],
        ['currentEnergyPrices', this.addText(0, 0, 'Energy\nPrices',18)],
        ['currentSolarProduction', this.addText(0, 0, 'Solar\nProduction',18)]
    ]);

    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentIndividualStats'),this.HUDIndividualStats, -80);
    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentTotalStats'),this.HUDCommunityStats, -95);
    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentEnergyPrices'),this.HUDEnergyPrices, -70);
    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentSolarProduction'),this.HUDSolarProduction, -60);
    
    Phaser.Display.Align.To.RightTop(this.labelTextElements.get('time'),this.HUDSolarProduction, 32);


    this.valueTextElements = new Map([
        ['time', this.addText(50, 450, '00:00',24)],
        ['currentIndividualStatsBuy', this.addText(0, 200, '0.00',20)],
        ['currentIndividualStatsSell', this.addText(0, 200, '0.00',20)],
        ['currentIndividualStatsSave', this.addText(0, 200, '0.00',20)],
        ['currentTotalStatsBuy', this.addText(0, 200, '0.00',20)],
        ['currentTotalStatsSell', this.addText(0, 200, '0.00',20)],
        ['currentTotalStatsSave', this.addText(0, 200, '0.00',20)],
        ['currentEnergyPrices', this.addText(0, 200, '0.00/0.00',20)],
        ['currentSolarProduction', this.addText(0, 200, '0.00/0.00',20)],
    ]);

    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentIndividualStatsBuy'),this.HUDIndividualStats, -230);
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentIndividualStatsSell'),this.HUDIndividualStats, -328);
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentIndividualStatsSave'),this.HUDIndividualStats, -436);
    
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentTotalStatsBuy'),this.HUDCommunityStats, -242);
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentTotalStatsSell'),this.HUDCommunityStats, -340);
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentTotalStatsSave'),this.HUDCommunityStats, -448);
    
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentEnergyPrices'),this.HUDEnergyPrices, -180);
    
    Phaser.Display.Align.In.LeftCenter(this.valueTextElements.get('currentSolarProduction'),this.HUDSolarProduction, -180);
    
    Phaser.Display.Align.To.RightBottom(this.valueTextElements.get('time'),this.HUDSolarProduction, 30);

      // create events
      const simulation = this.scene.get('SimulationScene');
      simulation.events.on('timeChanged', this.updateTime, this);
      simulation.events.on('individualStatsChanged', this.updateIndividualStats, this);
      simulation.events.on('totalStatsChanged', this.updateTotalStats, this);
      simulation.events.on('currentProductionChanged', this.updateCurrentSolarProduction, this);
      simulation.events.on('currentEnergyPricesChanged', this.updateEnergyPrices, this);

    }
  
    addText(x, y, value, size = 32) {
      return this.add.text(x, y, value, { fontFamily: 'Comic Sans MS', fontSize: `${size}px`, fill: '#FFF' });
    }
  
    updateTime(time) {
      var digitalTime = this.convertTimeUnitsToDigital(time);
      this.valueTextElements.get('time').setText(`${digitalTime['hour']}:${digitalTime['minute']}`);
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
    updateEnergyPrices(currentBuyingPrice, currentSellingPrice) {
        // Note: Present data as production in kW/h, not kW/timeUnit
      this.valueTextElements.get('currentEnergyPrices').setText(`${currentBuyingPrice.toFixed(2)}/${currentSellingPrice.toFixed(2)}`);
    }

    convertTimeUnitsToDigital(time){
        var dayLength = this.registry.values.dayLength;
        var tucf = dayLength / 24;
        var hour = Math.floor(time/tucf);
        var minute = Math.round((time/tucf - hour) * 60);
        var hourString = hour.toString().padStart(2, '0');
        var minuteString = minute.toString().padStart(2, '0');

        return {"hour": hourString, "minute": minuteString};
    }
  }