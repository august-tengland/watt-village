
// Manages updates of energy production, pricing, and calculates costs
export class TotalEnergyHandler {
  
  // init from params
  scene;
  devices;
  time;
  dayLength;
  totalSolarPanelEffect;
  currentDayKey;
  // pointers
  individualEnergyHandlers;
  houseSolarPanelHandlers;

  // init from json-data
  energyPricesPerTimeUnit;
  solarSchedulePerTimeUnit;
  
  // current values
  currentTotalConsumption;
  currentTotalSolarProduction;
  currentConsumptionPerHouse;
  currentSolarProductionPerHouse;
  currentConsumptionFractions;
  //currentSolarFraction; // NOTE: Maybe add?

  // aggregated values
  totalCost;
  totalSelling;
  totalSavings;

  constructor(params) { 
    // variables
    this.scene = params.scene;
    this.devices = params.devices;
    this.time = params.time;
    this.dayLength = params.dayLength;
    this.currentDayKey = params.currentDayKey;

    this.individualEnergyHandlers = params.individualEnergyHandlers;
    this.houseSolarPanelHandlers = params.houseSolarPanelHandlers;

    this.totalSolarPanelEffect = this.getTotalSolarPanelEffect();

    this.currentTotalConsumption = 0;
    this.currentTotalSolarProduction = 0;
    this.currentConsumptionPerHouse = [0,0];
    this.currentSolarProductionPerHouse = [0,0];
    this.currentConsumptionFractions = [0,0,0,0];

    this.totalCost = 0;
    this.totalSelling = 0;
    this.totalSavings = 0;
    this.energyPricesPerTimeUnit = this.generateEnergyPrices(params.currentDayKey);
  }

  runUpdate(newTime) {
    this.time = newTime % this.dayLength;
    this.updateCurrentConsumption();
    this.updateCurrentSolarProduction();
    this.updateTotalCost();
  }

  getTotalSolarPanelEffect() {

    var totalSolarPanelEffect = 0;

    for(var [key, hsph] of this.houseSolarPanelHandlers) {
      totalSolarPanelEffect += hsph.solarPanelEffect;
    }
    return totalSolarPanelEffect;
  }

  updateCurrentConsumption() {

    this.currentConsumptionPerHouse = [0,0];
    this.currentTotalConsumption = 0;

    // Calculate total consumption in each and all buildings
    for(var [key, ieh] of this.individualEnergyHandlers) {
      if(ieh.house == 0) this.currentConsumptionPerHouse[0] += ieh.currentConsumption
      else this.currentConsumptionPerHouse[1] += ieh.currentConsumption;
      this.currentTotalConsumption += ieh.currentConsumption;
    }

    // Calculate the fraction in which each house is responsible 
    for(var [key, ieh] of this.individualEnergyHandlers) {
      this.currentConsumptionFractions[ieh.apartment - 1] = ieh.currentConsumption / this.currentTotalConsumption;
      //console.log("fraction of consumption by apartment", ieh.apartment, ": ", this.currentConsumptionFractions[ieh.apartment - 1]);
    }
    
    //console.log("total current consumption: ", this.currentTotalConsumption);
    this.scene.events.emit('currentConsumptionChanged', this.currentTotalConsumption);
   }

   updateCurrentSolarProduction() {
    this.currentSolarProductionPerHouse = [0,0];
    this.currentTotalSolarProduction = 0;

    for(var [key, hsph] of this.houseSolarPanelHandlers) {
      this.currentSolarProductionPerHouse[hsph.house] = hsph.currentSolarProduction;
      this.currentTotalSolarProduction += hsph.currentSolarProduction;
    }
    //console.log("current production for house 0: ", this.currentSolarProductionPerHouse[0]);
    //console.log("current production for house 1: ", this.currentSolarProductionPerHouse[1]);
    //console.log("total production: ", this.currentTotalSolarProduction);
    this.scene.events.emit('currentProductionChanged', this.currentTotalSolarProduction, this.totalSolarPanelEffect);
   }


   updateTotalCost() {

    this.scene.events.emit('currentEnergyPricesChanged', this.energyPricesPerTimeUnit['buy'][this.time], this.energyPricesPerTimeUnit['sell'][this.time]);

    var energyDiff = this.currentTotalConsumption - this.currentTotalSolarProduction;
    //console.log("current energy difference: ", energyDiff);
    // The cost that would have been incurred if no solar production was present
    var potentialCostThisTimeUnit = this.currentTotalConsumption * this.energyPricesPerTimeUnit['buy'][this.time]

    if (energyDiff >= 0) { // If consuming more than producing
      //console.log("current energy price (buy):", this.energyPricesPerTimeUnit['buy'][this.time]);
      
      // The cost that was actually incurred, including savings from solar production
      var actualCostThisTimeUnit = energyDiff * this.energyPricesPerTimeUnit['buy'][this.time];      
      //console.log("Total cost for this time unit:", actualCostThisTimeUnit);

      this.totalCost += actualCostThisTimeUnit;
      //console.log("actual:", actualCostThisTimeUnit);
      //console.log("potential:", potentialCostThisTimeUnit);
      //console.log("diff:", potentialCostThisTimeUnit - actualCostThisTimeUnit);
      //console.log("savings:", this.totalSavings)
      this.totalSavings += (potentialCostThisTimeUnit - actualCostThisTimeUnit);

      for(var [key, ieh] of this.individualEnergyHandlers) {
        var potentialIndividualCostThisTimeUnit = potentialCostThisTimeUnit*this.currentConsumptionFractions[ieh.apartment-1];
        var actualIndividualCostThisTimeUnit = actualCostThisTimeUnit*this.currentConsumptionFractions[ieh.apartment-1];
        ieh.updateTotalCost({
                        'costThisTimeUnit': actualIndividualCostThisTimeUnit,
                        'sellingThisTimeUnit': 0,
                        'savingsThisTimeUnit': potentialIndividualCostThisTimeUnit - actualIndividualCostThisTimeUnit});
      }

    } else { // If producing more than consuming
      //console.log("current energy price (sell):", this.energyPricesPerTimeUnit['sell'][this.time]);

      // The money that was made selling excess electricity
      var SellingThisTimeUnit = -1 * energyDiff * this.energyPricesPerTimeUnit['sell'][this.time];      
      //console.log("Total selling for this time unit:", SellingThisTimeUnit);

      this.totalSelling += SellingThisTimeUnit;
      this.totalSavings += (potentialCostThisTimeUnit + SellingThisTimeUnit);

      for(var [key, ieh] of this.individualEnergyHandlers) {
        var potentialIndividualCostThisTimeUnit = potentialCostThisTimeUnit*this.currentConsumptionFractions[ieh.apartment-1];
        var individualSellingThisTimeUnit = SellingThisTimeUnit*0.25; // NOTE: Change to account for apartment size
        ieh.updateTotalCost({
                        'costThisTimeUnit': 0,
                        'sellingThisTimeUnit': individualSellingThisTimeUnit,
                        'savingsThisTimeUnit': potentialIndividualCostThisTimeUnit + individualSellingThisTimeUnit});
            }
    }
    this.scene.events.emit('totalStatsChanged', this.totalCost, this.totalSelling, this.totalSavings);
   }

   generateEnergyPrices(currentDayKey) {
    const json = this.scene.cache.json.get('energyPricesJSON');
    const energyPricesData = json[currentDayKey];
    return this.convertEnergyPricesToArray(energyPricesData);
   }

   // Converts the loaded json file to array
   // Hourly prices converted to prices per time unit
   convertEnergyPricesToArray(energyPricesData) {
      var energyPricesPerTimeUnit = {
        'buy' : [],
        'sell': []
      }
      var energyPricesArray = [];
      // Time Unit Conversion Factor
      var tucf = this.dayLength / 24;
      for (var h = 0; h < 24; h++) {
        for (var d = 0; d < tucf; d++) {
          // Convert "öre" to "kronor" (divide by 100)
          energyPricesPerTimeUnit['buy'][h*tucf+d] = energyPricesData['buy'][h.toString(10)] / 100;
          energyPricesPerTimeUnit['sell'][h*tucf+d] = energyPricesData['sell'][h.toString(10)] / 100;
        }
      }
      return energyPricesPerTimeUnit;
   }

 }