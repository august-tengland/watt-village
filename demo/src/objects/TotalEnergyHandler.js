
// Manages updates of energy production, pricing, and calculates costs
export class TotalEnergyHandler {
  
  // init from params
  scene;
  devices;
  time;
  timeAbsolute;
  startTime;
  dayLength;
  totalSolarPanelEffect;
  currentDayKey;
  baseline;

  // pointers
  individualEnergyHandlers;
  houseSolarPanelHandlers;
  powerlines;
  tucf;

  // init from json-data
  energyPricesPerTimeUnit;
  solarSchedulePerTimeUnit;
  
  // current values
  totalConsumption;
  totalSolarUsage;
  currentTotalConsumption;
  currentTotalSolarProduction;
  currentTotalBuying;
  currentTotalSelling;
  currentConsumptionPerHouse;
  currentSolarProductionPerHouse;
  powerlineFractions;
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
    this.timeAbsolute = params.time;
    this.startTime = params.time;
    this.dayLength = params.dayLength;
    this.tucf = params.dayLength / 24;
    this.currentDayKey = params.currentDayKey;
    this.baseline = params.baseline;

    this.individualEnergyHandlers = params.individualEnergyHandlers;
    this.houseSolarPanelHandlers = params.houseSolarPanelHandlers;
    this.powerlines = params.powerlines;

    this.totalSolarPanelEffect = this.getTotalSolarPanelEffect();

    this.totalConsumption = 0;
    this.totalSolarUsage = [0,0,0,0,0];
    this.currentTotalConsumption = 0;
    this.currentTotalSolarProduction = 0;
    this.currentTotalBuying = 0;
    this.currentTotalSelling = 0;
    this.currentConsumptionPerHouse = [0,0];
    this.currentSolarProductionPerHouse = [0,0];
    this.personConsumptionFractions = [0,0,0,0];
    this.powerlineFractions = [0,0,0,0,0];

    this.totalCost = 0;
    this.totalSelling = 0;
    this.totalSavings = 0;
    this.energyPricesPerTimeUnit = this.generateEnergyPrices(params.currentDayKey);
  }

  runUpdate(newTime) {
    this.time = newTime % this.dayLength;
    this.timeAbsolute = newTime;
    this.updateCurrentConsumption();
    this.updateCurrentSolarProduction();
    this.updatePowerlinesAlpha();
    this.updateTotalCost();
  }

  runProbe(newTime) {
    this.time = newTime % this.dayLength;
    this.timeAbsolute = newTime;
    this.updateCurrentConsumption();
    this.updateCurrentSolarProduction();
    this.updatePowerlinesAlpha();
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
    
    this.powerlines.forEach(powerline => {
      //console.log(powerline.type);

      if (powerline.type === "solar") powerline.setAlpha(solarAlpha);
      else if (powerline.type === "bought") powerline.setAlpha(boughtAlpha);
      else if (powerline.type === "solarSell") powerline.setAlpha(soldAlpha);
      else { // Mixed
        //console.log("hellooo?");
        var totalUsageFactor = 0;
        //console.log(powerline); 
        //console.log(this.powerlineFractions); 
        if (powerline.apartment > 0) {
          totalUsageFactor = this.powerlineFractions[powerline.apartment];
        } else if (powerline.house > 0) {
          totalUsageFactor = this.powerlineFractions[powerline.house] + this.powerlineFractions[powerline.house+2]; 
        } else { // Car charger
          totalUsageFactor = this.powerlineFractions[0];
        }
        //console.log("total usage factor:", totalUsageFactor);
        if (powerline.type === "mixedSolar") powerline.setAlpha(effectToAlpha(usedSolarEffect * totalUsageFactor));
        else if (powerline.type === "mixedBought") powerline.setAlpha(effectToAlpha(boughtAlpha * totalUsageFactor));
      }
    });
  }


  updateCurrentConsumption() {

    this.currentConsumptionPerHouse = [0,0];
    this.currentTotalConsumption = 0;
    this.personConsumptionFractions = [0,0,0,0];
    this.powerlineFractions = [0,0,0,0,0];

    // Calculate total consumption in each and all buildings
    for(var [key, ieh] of this.individualEnergyHandlers) {
      if (ieh.isActive) {
        if(ieh.house == 0) this.currentConsumptionPerHouse[0] += ieh.currentConsumption
        else this.currentConsumptionPerHouse[1] += ieh.currentConsumption;
        this.currentTotalConsumption += ieh.currentConsumption;
      }
    }

    // Calculate the fraction in which each house is responsible 
    for(var [key, ieh] of this.individualEnergyHandlers) {
      if (ieh.isActive) {
        this.personConsumptionFractions[ieh.apartment-1] = ieh.currentConsumption / this.currentTotalConsumption;
        this.powerlineFractions[ieh.apartment] = ieh.currentApartmentConsumption / this.currentTotalConsumption;
        this.powerlineFractions[0] += ieh.currentOutsideConsumption / this.currentTotalConsumption;
      }
    }
    this.scene.events.emit('currentConsumptionChanged', this.currentTotalConsumption);
   }

   updateCurrentSolarProduction() {
    this.currentSolarProductionPerHouse = [0,0];
    this.currentTotalSolarProduction = 0;

    for(var [key, hsph] of this.houseSolarPanelHandlers) {
      if(hsph.isActive) {
        this.currentSolarProductionPerHouse[hsph.house] = hsph.currentSolarProduction;
        this.currentTotalSolarProduction += hsph.currentSolarProduction;
      }
    }
    this.scene.events.emit('currentProductionChanged', this.currentTotalSolarProduction, this.totalSolarPanelEffect);
   }


   updateTotalCost() {

    //var solarCapacity = 0; // Note: Change this later
    //var numberPeopleWithCar = 0;
    //var numberPeopleNoCar = 0;
    var solarFraction = 0; // How much of the available solar power are you expected to claim? 
    
    if (this.currentDayKey === "day1") {
      solarFraction = 1;

    } else if (this.currentDayKey === "day2") {
      solarFraction = 0.5;

    } else if (this.currentDayKey === "day3") {
      solarFraction = 0.25;
    }

    this.totalConsumption += this.currentTotalConsumption;

    this.scene.events.emit('currentEnergyPricesChanged', this.energyPricesPerTimeUnit['buy'][this.time], this.energyPricesPerTimeUnit['sell'][this.time]);
    var energyDiff = this.currentTotalConsumption - this.currentTotalSolarProduction;


    // The cost that would have been incurred if no solar production was present
    // What would be the cost if we were running these activities during the most expensive hour (without solar)

    if (energyDiff >= 0) { // If consuming more than producing
      //console.log("current energy price (buy):", this.energyPricesPerTimeUnit['buy'][this.time]);
      
      // The cost that was actually incurred, including savings from solar production
      var actualCostThisTimeUnit = energyDiff * this.energyPricesPerTimeUnit['buy'][this.time];      

      this.totalCost += actualCostThisTimeUnit;

      for(var [key, ieh] of this.individualEnergyHandlers) {
        this.totalSolarUsage[ieh.apartment] += this.currentTotalSolarProduction * this.personConsumptionFractions[ieh.apartment-1];
        var actualIndividualCostThisTimeUnit = actualCostThisTimeUnit*this.personConsumptionFractions[ieh.apartment-1];
        ieh.updateTotalCost({
                        'costThisTimeUnit': actualIndividualCostThisTimeUnit,
                        'sellingThisTimeUnit': 0});
      }

    } else { // If producing more than consuming

      this.totalSolarUsage[0] += -1*energyDiff;
      // The money that was made selling excess electricity
      var SellingThisTimeUnit = -1 * energyDiff * this.energyPricesPerTimeUnit['sell'][this.time];      

      this.totalSelling += SellingThisTimeUnit;
       
      for(var [key, ieh] of this.individualEnergyHandlers) {
        this.totalSolarUsage[ieh.apartment] += this.currentTotalConsumption * this.personConsumptionFractions[ieh.apartment-1]; // Consumption covered entirely by solar
        var individualSellingThisTimeUnit = SellingThisTimeUnit*solarFraction; // Account for apartment size
        ieh.updateTotalCost({
                        'costThisTimeUnit': 0,
                        'sellingThisTimeUnit': individualSellingThisTimeUnit});
            }
    }
    const progression = this.totalConsumption/(this.baseline['estimatedCommunityConsumption']);
    //console.log(this.totalConsumption);
    //console.log(this.totalSolarUsage);
    const consumptionBaseline = (this.totalCost-this.totalSelling);
    this.totalSavings = (this.baseline['estimatedCommunityCost'] -consumptionBaseline/progression) * progression;
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

   getStats() {
    const stats = {
      buy: this.totalCost,
      sell: this.totalSelling,
      save: this.totalSavings,
    }

    return stats;
   }

 }