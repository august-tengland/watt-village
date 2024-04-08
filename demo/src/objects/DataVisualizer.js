

export class DataVisualizer {
  
    polygonTypes;
    // init from params
    scene;
    currentDayKey;
  
    // init from json-data
    solarSchedule;
    energyPrices;

    // Used to give preliminary assesment on savings
    baseLineSavings;

    
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

    fetchDailyGoal(currentDayKey) {
      const json = this.scene.cache.json.get('dailyGoalsJSON');
      const dailyGoalData = json[currentDayKey];
      return dailyGoalData;
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

    getSchemaSquares(schemaType, schedule ,dimensions) {
      var additionalOffsetFractionX = null;
        switch (schemaType) {
          case "presenceActivity":
            additionalOffsetFractionX = 0.00;
            break;
          case "idleActivity":
            additionalOffsetFractionX = 0.50;
            break;
          default:
            console.error("Requested schema type does not exist!");
        }

        return this.convertScheduleToSchemaSquares(schedule, 
                                                  additionalOffsetFractionX,
                                                  dimensions.offsetX,
                                                  dimensions.offsetY,
                                                  dimensions.width,
                                                  dimensions.height);
    }




    convertScheduleToPolygon(schedule, maxValue, offsetX, offsetY, width, height) {
      //const maxValue = Math.max(Object.values(schedule));
      const normalizerX =  width/maxValue;
      const normalizerY = height/23;
      var polygonPoints = [];
      var midpoints = [];
      
      // Overflow handling
      var middleValue = (schedule["0"] + schedule["23"])/2;

      polygonPoints.push([offsetX, offsetY-normalizerY/2]);
      polygonPoints.push([offsetX + middleValue * normalizerX, offsetY-normalizerY/2]);

      for (const [timestep, value] of Object.entries(schedule)) {
        var x = offsetX + value * normalizerX;
        var y = offsetY + timestep * normalizerY;
        polygonPoints.push([x, y]);
      }
      // Overflow handling
      polygonPoints.push([offsetX + middleValue * normalizerX, offsetY+height+normalizerY/2]);
      polygonPoints.push([offsetX, offsetY+height+normalizerY/2]);
      return polygonPoints.flat(1);
    }

    convertScheduleToSchemaSquares(schedule, additionalOffsetFractionX, offsetX, offsetY, width, height) {
      var schemaSquares = [];
      var midpoints = [];

      var squareWidth = width/2-3;
      var totalOffsetX = offsetX + width*additionalOffsetFractionX + 2;
      const normalizerY = height/23;

      var x1 = totalOffsetX;
      var x2 = totalOffsetX + squareWidth;
      var maxY = height+offsetY;

      for (const [activityKey, value] of Object.entries(schedule)) {
        var y1 = offsetY + value['start'] * normalizerY;
        var y2 = offsetY + value['end'] * normalizerY;
        if (y2 > maxY) { // Overflow: Add two rectangles
          var overflow = y2-maxY;
          y2 = maxY + normalizerY/2;

          var dy1 = offsetY - normalizerY/2;
          var dy2 = offsetY + overflow - normalizerY;

          var midpoint = {activityKey: activityKey, isDuplicate: false, x: ((x1+x2)/2), y: ((y1+y2)/2)};
          var midpointDuplicate = {activityKey: activityKey, isDuplicate: true, x: ((x1+x2)/2), y: ((dy1+dy2)/2)};

          schemaSquares.push([[x1, y1], [x2, y1], [x2, y2], [x1, y2]].flat());
          schemaSquares.push([[x1, dy1], [x2, dy1], [x2, dy2], [x1, dy2]].flat());
          midpoints.push(midpoint);
          midpoints.push(midpointDuplicate);
        } 
        else {
          var midpoint = {activityKey: activityKey, isDuplicate: false, x: ((x1+x2)/2), y: ((y1+y2)/2)};
          schemaSquares.push([[x1, y1], [x2, y1], [x2, y2], [x1, y2]].flat());
          midpoints.push(midpoint);
        }
      }
      return [schemaSquares, midpoints];
    }

    createBaseline(activitySchedule) {
      return this.getCostPrediction(activitySchedule);
    }

    getPredictedSavings(activitySchedule, baseline) {
      const estimate = this.getCostPrediction(activitySchedule);
      console.log(estimate,baseline);
      return  baseline['estimatedTotalCost']- estimate['estimatedTotalCost'];
    }

    // TODO: ADD SOLAR POWER INTO EQUATION 
    // Assume: Everyone acts the same as you, meaning:
    // - When you consume, you have access to 25% of the solar power (since the three others are doing the same thing)
    // - When you don't consume, no one is using solar power (i.e. everything sold)
    // - For excess (sold): you get 25% of the savings 
    getCostPrediction(activitySchedule) {
      const estimate = {};
      const devicePredictedConsumptions = {
        dinner: 1.0*(5/6), // Note: Only for 50 minutes of the two hour timing
        tv: 0.05,
        washingMachine: 1.0,
        dishwasher: 1.0,
        carCharge: 11.0,
      };
      var consumptionArray = new Array(24).fill(0.05);
      for (const [activityKey, activity] of Object.entries(activitySchedule)) {
        console.log(activityKey,activity);
        for(var i = activity.startTime; i < activity.startTime + activity.duration; i++) {
          if(activityKey in devicePredictedConsumptions){
            if(!(activityKey == 'dinner' && i > activity.startTime)) {
              consumptionArray[i] += devicePredictedConsumptions[activityKey]; 
            }
          }
        }
      };
      consumptionArray = consumptionArray.map((value) => Number(value.toFixed(3)));
      console.log(consumptionArray);

      this.energyPrices['buy']
      var estimatedTotalCost = 0;
      for (var hour = 0; hour < 24; hour++) {
        estimatedTotalCost += consumptionArray[hour] * this.energyPrices['buy'][hour]/100; 
        //console.log(this.energyPrices['buy'][hour]);
      }

      estimate['consumptionPerHour'] = consumptionArray;
      estimate['estimatedTotalCost'] = estimatedTotalCost;
      return estimate
    }

 
  
   }