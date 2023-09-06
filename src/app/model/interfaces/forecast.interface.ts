export interface ForecastInterface {
    hourly_units: {
        apparent_temperature: string,
        precipitation: string,
        precipitation_probability: string,
        temperature_2m: string,
        windspeed_10m: string,
        time: string[]
    };
    hourly: WeatherForecastHourly,
    elevation: number;
    latitude: number;
    longitude: number;
    timezone: string;
}

export interface WeatherForecastHourly {
    apparent_temperature: number[],
    precipitation: number[],
    precipitation_probability: number[],
    temperature_2m: number[],
    windspeed_10m: number[],
    time: string[]
}

export interface WeatherForecastHourlyUnit {
    apparent_temperature: number,
    precipitation: number,
    precipitation_probability: number,
    temperature_2m: number,
    windspeed_10m: number,
    time: string
}