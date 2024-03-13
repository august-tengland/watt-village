
// Manages updates of energy production, pricing, and calculates costs
export class EnergyHandler {

  scene;
  devices;
  time;
  dayLength;
  currentDayKey
  currentConsumption;
  energyPricesPerTimeUnit;

  constructor(params) { 
    // variables
    this.scene = params.scene;
    this.devices = params.devices;
    this.time = params.time;
    this.dayLength = params.dayLength;
    this.currentDayKey = params.currentDayKey;
    this.currentConsumption = 0;
    this.energyPricesPerTimeUnit = this.generateEnergyPrices(params.currentDayKey);

  }

  runUpdate(newTime) {
    this.time = newTime;
    this.updateCurrentConsumption();
  }

   updateCurrentConsumption(){
    this.currentConsumption = 0;
    for(var [key, device] of this.devices) {
      this.currentConsumption += device.getCurrentConsumption();
    }
    console.log("current consumption: ", this.currentConsumption);
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
          energyPricesArray[h*tucf+d] = energyPricesData[h.toString(10)];
        }
      }
      return energyPricesArray;
   }
 }