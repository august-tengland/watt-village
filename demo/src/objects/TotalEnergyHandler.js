
// Manages updates of energy production, pricing, and calculates costs
export class TotalEnergyHandler {
  
  // init from params
  scene;
  devices;
  time;
  dayLength;
  solarPanelEffect;
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

  // aggregated values
  totalCost;

  constructor(params) { 
    // variables
    this.scene = params.scene;
    this.devices = params.devices;
    this.time = params.time;
    this.dayLength = params.dayLength;
    this.currentDayKey = params.currentDayKey;

    this.individualEnergyHandlers = params.individualEnergyHandlers;
    this.houseSolarPanelHandlers = params.houseSolarPanelHandlers;

    this.currentTotalConsumption = 0;
    this.currentTotalSolarProduction = 0;
    this.currentConsumptionPerHouse = [0,0];
    this.currentSolarProductionPerHouse = [0,0];

    this.totalCost = 0;
    this.energyPricesPerTimeUnit = this.generateEnergyPrices(params.currentDayKey);
  }

  runUpdate(newTime) {
    this.time = newTime;
    this.updateCurrentConsumption();
    this.updateCurrentSolarProduction();
    this.calculateEnergyDifference();
    this.updateTotalCost();
  }

  updateCurrentConsumption() {

    this.currentConsumptionPerHouse = [0,0];
    this.currentTotalConsumption = 0;

    for(var [key, ieh] of this.individualEnergyHandlers) {
      if(ieh.house == 0) this.currentConsumptionPerHouse[0] += ieh.currentConsumption
      else this.currentConsumptionPerHouse[1] += ieh.currentConsumption;
      this.currentTotalConsumption += ieh.currentConsumption;
    }
    console.log("current consumption for house 0: ", this.currentConsumptionPerHouse[0]);
    console.log("current consumption for house 1: ", this.currentConsumptionPerHouse[1]);
    console.log("total current consumption: ", this.currentTotalConsumption);
   }

   updateCurrentSolarProduction() {
    this.currentSolarProductionPerHouse = [0,0];
    this.currentTotalSolarProduction = 0;

    for(var [key, hsph] of this.houseSolarPanelHandlers) {
      this.currentSolarProductionPerHouse[hsph.house] = hsph.currentSolarProduction;
      this.currentTotalSolarProduction += hsph.currentSolarProduction;
    }
    console.log("current production for house 0: ", this.currentSolarProductionPerHouse[0]);
    console.log("current production for house 1: ", this.currentSolarProductionPerHouse[1]);
    console.log("total production: ", this.currentTotalSolarProduction);
   }

   calculateEnergyDifference(){
    var energyDiff = this.currentTotalConsumption - this.currentTotalSolarProduction;
    console.log("current energy difference: ", energyDiff);
   }

   updateTotalCost() {
    console.log("current energy price:", this.energyPricesPerTimeUnit[this.time]);
    var costThisTimeUnit = this.currentConsumption * this.energyPricesPerTimeUnit[this.time];
    this.totalCost += costThisTimeUnit;
    this.scene.registry.values.individualCost = this.totalCost;
    console.log("cost this time unit:", costThisTimeUnit);
    console.log("totalCost:", this.totalCost);
   }

   generateEnergyPrices(currentDayKey) {
    var energyPricesData = null;
    fetch("./src/data/energyPrices.json")
      .then((response) => response.json())
      .then((json) => {
        energyPricesData = json[this.currentDayKey];
        this.energyPricesPerTimeUnit = this.convertEnergyPricesToArray(energyPricesData);
      });
   }

   // Converts the loaded json file to array
   // Hourly prices converted to prices per time unit
   convertEnergyPricesToArray(energyPricesData) {
      var energyPricesArray = [];
      // Time Unit Conversion Factor
      var tucf = this.dayLength / 24;
      for (var h = 0; h < 24; h++) {
        for (var d = 0; d < tucf; d++) {
          // Convert "öre" to "kronor" (divide by 100)
          energyPricesArray[h*tucf+d] = energyPricesData[h.toString(10)] / 100;
        }
      }
      return energyPricesArray;
   }

   generateSolarSchedule(currentDayKey) {
    var solarScheduleData = null;
    fetch("./src/data/solarSchedule.json")
      .then((response) => response.json())
      .then((json) => {
        solarScheduleData = json[this.currentDayKey]['buy'];
        this.solarSchedulePerTimeUnit = this.convertSolarScheduleToArray(solarScheduleData);
      });
   }

   // Converts the loaded json file to array
   // Solar Schedule converted to sun per time unit
   convertSolarScheduleToArray(solarScheduleData) {
      var solarScheduleArray = [];
      // Time Unit Conversion Factor
      var tucf = this.dayLength / 24;
      for (var h = 0; h < 24; h++) {
        for (var d = 0; d < tucf; d++) {
          
          if (h == 23) {
            solarScheduleArray[h*tucf+d] = (solarScheduleData[h.toString(10)]*((tucf-d)/tucf) 
                                            + solarScheduleData["0"]*(d/tucf));
          } else {
            solarScheduleArray[h*tucf+d] = (solarScheduleData[h.toString(10)]*((tucf-d)/tucf) 
                                            + solarScheduleData[(h+1).toString(10)]*(d/tucf));
          }
        }
      }
      console.log(solarScheduleData);
      console.log(solarScheduleArray);
      return solarScheduleArray;
   }
 }