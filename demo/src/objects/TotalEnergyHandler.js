
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
  powerlines;
  tucf;

  // init from json-data
  energyPricesPerTimeUnit;
  solarSchedulePerTimeUnit;
  
  // current values
  currentTotalConsumption;
  currentTotalSolarProduction;
  currentTotalBuying;
  currentTotalSelling;
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
    this.tucf = params.dayLength / 24;
    this.currentDayKey = params.currentDayKey;

    this.individualEnergyHandlers = params.individualEnergyHandlers;
    this.houseSolarPanelHandlers = params.houseSolarPanelHandlers;
    this.powerlines = params.powerlines;

    this.totalSolarPanelEffect = this.getTotalSolarPanelEffect();

    this.currentTotalConsumption = 0;
    this.currentTotalSolarProduction = 0;
    this.currentTotalBuying = 0;
    this.currentTotalSelling = 0;
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
    this.updatePowerlinesAlpha();
    this.updateTotalCost();
  }

  getTotalSolarPanelEffect() {

    var totalSolarPanelEffect = 0;

    for(var [key, hsph] of this.houseSolarPanelHandlers) {
      totalSolarPanelEffect += hsph.solarPanelEffect;
    }
    return totalSolarPanelEffect;
  }

  updatePowerlinesAlpha() {

    const effectToAlpha = (effect) => { // Sigmoid function
      var steep = -1;
      return 2 / (1 + Math.exp(steep*(this.tucf*effect))) - 1;
    };
    // estimatedMaxConsumptionPerApartment = 2kWh
    const energyDiff = this.currentTotalConsumption - this.currentTotalSolarProduction;
   
    const solarEffect = this.currentTotalSolarProduction;
    const boughtEffect = Math.max(0,energyDiff);
    const soldSolarEffect = Math.max(0,-1*energyDiff);
    const usedSolarEffect = solarEffect - soldSolarEffect;

    this.currentTotalBuying = boughtEffect;
    this.currentTotalSelling =soldSolarEffect;

    const solarAlpha = effectToAlpha(solarEffect);
    const boughtAlpha = effectToAlpha(boughtEffect);
    const soldAlpha = effectToAlpha(soldSolarEffect);
    
    // console.log(this.currentTotalSolarProduction);
    // console.log(this.currentTotalConsumption);
    // console.log(energyDiff);
    // console.log("solarEffect:", solarEffect,"boughtEffect:",boughtEffect,"soldEffect:", soldEffect);
    // console.log("solarAlpha:", solarAlpha,"boughtAlpha:",boughtAlpha,"soldAlpha:", soldAlpha);

    this.powerlines.forEach(powerline => {
      //console.log(powerline.type);

      if (powerline.type === "solar") powerline.setAlpha(solarAlpha);
      else if (powerline.type === "bought") powerline.setAlpha(boughtAlpha);
      else if (powerline.type === "solarSell") powerline.setAlpha(soldAlpha);
      else { // Mixed
        //console.log("hellooo?");
        var totalUsageFactor = 0;
        //console.log(powerline); 
        //console.log(this.currentConsumptionFractions); 
        if (powerline.apartment > 0) {
          totalUsageFactor = this.currentConsumptionFractions[powerline.apartment-1];
        } else if (powerline.house > 0) {
          totalUsageFactor = this.currentConsumptionFractions[powerline.house-1] + this.currentConsumptionFractions[powerline.house+1]; 
        } else { // Car charger
          totalUsageFactor = 0;
        }
        //console.log("total usage factor:", totalUsageFactor);
        if (powerline.type === "mixedSolar") powerline.setAlpha(effectToAlpha(usedSolarEffect * totalUsageFactor));
        else if (powerline.type === "mixedBought") powerline.setAlpha(effectToAlpha(boughtAlpha * totalUsageFactor));
      }
    });
  }

  // updatePowerlinesAlpha() {
  //   console.log(this.currentTotalConsumption);
   
  //   const estimatedMaxConsumption = 2;

  //   const energyDiff = this.currentTotalConsumption - this.currentTotalSolarProduction;
  //   const fractionSolar = Math.min(1,this.currentTotalSolarProduction / this.currentTotalConsumption);
  //   const fractionBought = Math.max(0,energyDiff / this.currentTotalConsumption);
  //   const fractionSold = Math.max(0,-1*energyDiff / this.currentTotalSolarProduction);

  //   var solarAlpha = this.currentTotalSolarProduction /this.totalSolarPanelEffect;
  //   //var boughtAlpha = this.currentTotalConsumption*fractionBought / estimatedMaxConsumption;
  //   var boughtAlpha = 1;
  //   var soldAlpha = solarAlpha * fractionSold;


  //   console.log("energyDiff");
  //   console.log("fractions:",fractionSolar, fractionBought, fractionSold);
  //   console.log("alphas:",solarAlpha, boughtAlpha, soldAlpha, mixedSolarAlpha, mixedBoughtAlpha);


  //   this.powerlines.forEach(powerline => {
  //     //console.log(powerline.type);

  //     if (powerline.type === "solar") powerline.setAlpha(solarAlpha);
  //     else if (powerline.type === "bought") powerline.setAlpha(boughtAlpha);
  //     else if (powerline.type === "solarSell") powerline.setAlpha(soldAlpha);
  //     else { // Mixed
  //       //console.log("hellooo?");
  //       var totalUsageFactor = 0;
  //       console.log(powerline); 
  //       console.log(this.currentConsumptionFractions); 
  //       if (powerline.apartment > 0) {
  //         totalUsageFactor = this.currentConsumptionFractions[powerline.apartment-1];
  //       } else if (powerline.house > 0) {
  //         totalUsageFactor = this.currentConsumptionFractions[powerline.house-1] + this.currentConsumptionFractions[powerline.house+1]; 
  //       } else { // Car charger
  //         totalUsageFactor = 0;
  //       }
  //       console.log("total usage factor:", totalUsageFactor);
  //       if (powerline.type === "mixedSolar") powerline.setAlpha(solarAlpha * totalUsageFactor);
  //       else if (powerline.type === "mixedBought") powerline.setAlpha(boughtAlpha * totalUsageFactor);
  //     }
  //   });
  // }

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