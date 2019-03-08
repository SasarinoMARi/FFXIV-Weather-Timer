var WeatherFinder = {

  getWeather(timeMillis, zoneName) {
    return this.getWeatherFromName(zoneName).chances(this.calculateForecastTarget(timeMillis));
  },

  calculateForecastTarget: function (timeMillis) {
    // Thanks to Rogueadyn's SaintCoinach library for this calculation.
    // lDate is the current local time.

    var unixSeconds = parseInt(timeMillis / 1000);
    // Get Eorzea hour for weather start
    var bell = unixSeconds / 175;

    // Do the magic 'cause for calculations 16:00 is 0, 00:00 is 8 and 08:00 is 16
    var increment = (bell + 8 - (bell % 8)) % 24;

    // Take Eorzea days since unix epoch
    var totalDays = unixSeconds / 4200;
    totalDays = (totalDays << 32) >>> 0; // Convert to uint

    // 0x64 = 100
    var calcBase = totalDays * 100 + increment;

    // 0xB = 11
    var step1 = ((calcBase << 11) ^ calcBase) >>> 0;
    var step2 = ((step1 >>> 8) ^ step1) >>> 0;

    // 0x64 = 100
    return step2 % 100;
  },

  getEorzeaHour: function (timeMillis) {
    var unixSeconds = parseInt(timeMillis / 1000);
    // Get Eorzea hour
    var bell = (unixSeconds / 175) % 24;
    return Math.floor(bell);
  },

  getWeatherTimeFloor: function (date) {
    var unixSeconds = parseInt(date.getTime() / 1000);
    // Get Eorzea hour for weather start
    var bell = (unixSeconds / 175) % 24;
    var startBell = bell - (bell % 8);
    var startUnixSeconds = unixSeconds - (175 * (bell - startBell));
    return new Date(startUnixSeconds * 1000);
  },

  getWeatherFromName: function (name) {
    for (var i = 0; i < this.weatherList.length; i++) {
      if (this.weatherList[i].name == name) return this.weatherList[i]
    }
    return null;
  },

  weatherList: [{
    "name": "Anemos",
    weathers: ["Fair Skies", "Gales", "Showers", "Snow"],
    chances: function (chance) { if ((chance -= 30) < 0) { return "Fair Skies"; } else if ((chance -= 30) < 0) { return "Gales"; } else if ((chance -= 30) < 0) { return "Showers"; } else { return "Snow"; } },
    trigger: ["Gales"]
  },
  {
    "name": "Pagos",
    weathers: ["Clear Skies", "Fog", "Heat Waves", "Snow", "Thunder", "Blizzards"],
    chances: function (chance) { if ((chance -= 10) < 0) { return "Clear Skies"; } else if ((chance -= 18) < 0) { return "Fog"; } else if ((chance -= 18) < 0) { return "Heat Waves"; } else if ((chance -= 18) < 0) { return "Snow"; } else if ((chance -= 18) < 0) { return "Thunder"; } else { return "Blizzards"; } },
    trigger: ["Fog", "Thunder", "Heat Waves", "Blizzards"]
  },
  {
    "name": "Pyros",
    weathers: ["Fair Skies", "Heat Waves", "Thunder", "Blizzards", "Umbral Wind", "Snow"],
    chances: function (chance) { if ((chance -= 10) < 0) { return "Fair Skies"; } else if ((chance -= 18) < 0) { return "Heat Waves"; } else if ((chance -= 18) < 0) { return "Thunder"; } else if ((chance -= 18) < 0) { return "Blizzards"; } else if ((chance -= 18) < 0) { return "Umbral Wind"; } else { return "Snow"; } },
    trigger: ["Thunder", "Umbral Wind", "Blizzards", "Heat Waves"]
  },
  {
    "name": "Hydatos",
    weathers: ["Fair Skies", "Showers", "Gloom", "Thunderstorms", "Snow"],
    chances: function (chance) { if ((chance -= 12) < 0) { return "Fair Skies"; } else if ((chance -= 22) < 0) { return "Showers"; } else if ((chance -= 22) < 0) { return "Gloom"; } else if ((chance -= 22) < 0) { return "Thunderstorms"; } else { return "Snow"; } },
    trigger: []
  }]
};

function getWeathers() {
  var results = {};

  for (var i = 0; i < WeatherFinder.weatherList.length; i++) {
    var zone = WeatherFinder.weatherList[i];
    if (zone.trigger.length == 0) continue;
    results[zone.name] = {};

    var weatherStartTime = WeatherFinder.getWeatherTimeFloor(new Date()).getTime();
    if ((weatherStartTime + "").endsWith("99999")) weatherStartTime++; // fuck you
    var weatherStartHour = WeatherFinder.getEorzeaHour(weatherStartTime);
    var weather = WeatherFinder.getWeather(weatherStartTime, zone.name);
    var prevWeather = WeatherFinder.getWeather(weatherStartTime - 1, zone.name);

    results[zone.name]['Current'] = weather;

    var flags = new Array(zone.trigger.length).fill(false);
    var tries = 0;
    while (tries < 125) {
      for (var j in zone.trigger) {
        if (flags[j]) continue;
        var tw = zone.trigger[j];
        if (tw == weather && tw != prevWeather) {
          if (weatherStartTime < new Date()) continue;
          results[zone.name][weather] = weatherStartTime;
          flags[j] = true;
          break;
        }
      }

      if (flags.every(isTrue)) break;

      weatherStartTime += 8 * 175 * 1000; // Increment by 8 Eorzean hours
      weatherStartHour = WeatherFinder.getEorzeaHour(weatherStartTime);
      prevWeather = weather;
      weather = WeatherFinder.getWeather(weatherStartTime, zone.name);
      tries++;
    }
  }

  return results;
}