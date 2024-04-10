

export class HouseSolarPanelHandler {
  
    // init from params
    key;
    scene;
    time;
    dayLength;
    solarPanelEffect;
    house;
    currentDayKey;
    isActive;
  
    // init from json-data
    solarSchedulePerTimeUnit;
    
    // current values
    currentSolarProduction;
  
  
    constructor(params) { 
      // variables
      this.key = params.key;
      this.scene = params.scene;
      this.time = params.time;
      this.house = params.house;
      this.dayLength = params.dayLength;
      this.currentDayKey = params.currentDayKey;
      this.solarPanelEffect = params.solarPanelEffect;
      this.isActive = params.isActive;
      this.currentSolarProduction = 0;
      this.solarSchedulePerTimeUnit = this.generateSolarSchedule(params.currentDayKey);
  
    }
  
    runUpdate(newTime) {
      this.time = newTime % this.dayLength; 
      this.updateSolarPanelProduction();
    }
  
     updateSolarPanelProduction() {
      if (this.isActive) {
        this.currentSolarProduction = this.solarSchedulePerTimeUnit[this.time] * this.solarPanelEffect;
      }
     }

     generateSolarSchedule(currentDayKey) {
      const json = this.scene.cache.json.get('solarScheduleJSON');
      const solarScheduleData = json[currentDayKey];
      return this.convertSolarScheduleToArray(solarScheduleData);
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
        ////console.log(solarScheduleData);
        ////console.log(solarScheduleArray);
        return solarScheduleArray;
     }
   }