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
        ['time', this.addText(1800, 100, 'time:')],
        ['currentIndividualStats', this.addText(0, 0, 'Individual\nStats',18)],
        ['currentTotalStats', this.addText(0, 0, 'Community\nStats',18)],
        ['currentConsumption', this.addText(0, 0, 'Energy\nPrices',18)],
        ['currentSolarProduction', this.addText(0, 0, 'Solar\nProduction',18)]
    ]);

    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentIndividualStats'),this.HUDIndividualStats, -80);
    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentTotalStats'),this.HUDCommunityStats, -95);
    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentConsumption'),this.HUDEnergyPrices, -70);
    Phaser.Display.Align.In.LeftCenter(this.labelTextElements.get('currentSolarProduction'),this.HUDSolarProduction, -60);


    this.valueTextElements = new Map([
        ['time', this.addText(50, 450, 'time: 0')],
        ['currentIndividualStats', this.addText(0, 200, 'current individual stats: 0')],
        ['currentTotalStats', this.addText(0, 200, 'current total stats: 0')],
        ['currentSolarProduction', this.addText(0, 200, 'current solar production: 0')],
        ['currentConsumption', this.addText(0, 200, 'current consumption: 0')],
    ]);


  
      // create events
      const simulation = this.scene.get('SimulationScene');
      simulation.events.on('timeChanged', this.updateTime, this);
      simulation.events.on('individualStatsChanged', this.updateIndividualStats, this);
      simulation.events.on('totalStatsChanged', this.updateTotalStats, this);
      simulation.events.on('currentProductionChanged', this.updateCurrentSolarProduction, this);
      simulation.events.on('currentConsumptionChanged', this.updateCurrentConsumption, this);

    }
  
    addText(x, y, value, size = 32) {
      return this.add.text(x, y, value, { fontFamily: 'Comic Sans MS', fontSize: `${size}px`, fill: '#FFF' });
    }
  
    updateTime(time) {
      var digitalTime = this.convertTimeUnitsToDigital(time);
      this.valueTextElements.get('time').setText(`time: ${digitalTime['hour']}:${digitalTime['minute']}`);
    }
    updateIndividualStats(individualCost, individualSelling, individualSavings){
        this.valueTextElements.get('currentIndividualStats').setText(`individual stats: buy:${individualCost.toFixed(2)} sell:${individualSelling.toFixed(2)} save:${individualSavings.toFixed(2)}`);
    }
    updateTotalStats(totalCost, totalSelling, totalSavings){
        this.valueTextElements.get('currentTotalStats').setText(`total stats: buy:${totalCost.toFixed(2)} sell:${totalSelling.toFixed(2)} save:${totalSavings.toFixed(2)}`);
    }
    updateCurrentSolarProduction(currentProduction, maxCapacity) {
        // Note: Present data as production in kW/h, not kW/timeUnit
      this.valueTextElements.get('currentSolarProduction').setText(`current solar production: ${currentProduction.toFixed(2)}/${maxCapacity.toFixed(2)}`);
    }
    updateCurrentConsumption(currentConsumption) {
        // Note: Present data as production in kW/h, not kW/timeUnit
      this.valueTextElements.get('currentConsumption').setText(`current consumption: ${currentConsumption.toFixed(2)}`);
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