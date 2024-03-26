

export class DataVisualizer {
  
    polygonTypes;
    // init from params
    scene;
    currentDayKey;
  
    // init from json-data
    solarSchedule;
    energyPrices;

    
    constructor(params) { 
      // variables
      this.scene = params.scene;
      this.currentDayKey = params.currentDayKey;
      this.solarSchedule = this.fetchSolarSchedule(params.currentDayKey);
      this.energyPrices = this.fetchEnergyPrices(params.currentDayKey);

      this.polygonTypes = ['solar','energyBuy','energySell'];
    }
  

    fetchSolarSchedule(currentDayKey) {
      const json = this.scene.cache.json.get('solarScheduleJSON');
      const solarScheduleData = json[currentDayKey];
      return solarScheduleData;
    }
  

    fetchEnergyPrices(currentDayKey) {
      const json = this.scene.cache.json.get('energyPricesJSON');
      const energyPricesData = json[currentDayKey];
      return energyPricesData;
    }

    getPolygonTypes() {
      return this.polygonTypes;
    }

    getPolygon(polygonType, dimensions) {
      var schedule = null;
      var maxValue = null;
        switch (polygonType) {
          case "solar":
            schedule = this.solarSchedule;
            maxValue = 1;
            break;
          case "energyBuy":
            schedule = this.energyPrices['buy'];
            maxValue = 150;
            break;
          case "energySell":
            schedule = this.energyPrices['sell'];
            maxValue = 150;
            break;
          default:
            console.error("Requested polygon type does not exist!");
        }
        return this.convertScheduleToPolygon(schedule, 
                                            maxValue,
                                            dimensions.offsetX,
                                            dimensions.offsetY,
                                            dimensions.width,
                                            dimensions.height);
    }


    convertScheduleToPolygon(schedule, maxValue, offsetX, offsetY, width, height) {
      console.log("test");
      //const maxValue = Math.max(Object.values(schedule));
      const normalizer =  width/maxValue;
      var polygonPoints = [];
      polygonPoints.push([offsetX, offsetY]);
      for (const [timestep, value] of Object.entries(schedule)) {
        var x = offsetX  + value * normalizer;
        var y = offsetY + (timestep/23)*height;
        polygonPoints.push([x, y]);
      }
      polygonPoints.push([offsetX, offsetY+height]);
      return polygonPoints.flat(1);
    }
  
   }