import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, tap } from 'rxjs';
import { LocationInterface } from '../model/interfaces/location.interface';
import { ForecastInterface, WeatherForecastHourlyUnit } from '../model/interfaces/forecast.interface';
import moment from 'moment-timezone';

@Injectable({
  providedIn: 'root'
})
export class MeteoService {

  constructor(private http: HttpClient) { }

  getForecast(query: string): Observable<ForecastInterface> {
    const url: string = 'https://api.open-meteo.com/v1/forecast?';
    const dateFrom: string = moment().subtract(7, 'days').format('YYYY-MM-DD');
    const dateTo: string = moment().add(7, 'days').format('YYYY-MM-DD');
    return this.http.get<ForecastInterface>(url + query + `&start_date=${dateFrom}&end_date=${dateTo}`);
  }

  getCurrentHourlyForecast(forecast: ForecastInterface): WeatherForecastHourlyUnit | undefined {
    const now: number = new Date().getTime();
    const currentIdx: number = 0;
    let res: WeatherForecastHourlyUnit | undefined;
    forecast?.hourly.time.forEach((_hourlyForecastTime, idx) => {
      const from: number = new Date(_hourlyForecastTime).getTime();
      if (forecast && (idx+1) < forecast?.hourly.time.length) {
        const to: number = new Date(forecast.hourly.time[idx+1]).getTime();
        if (now>=from && now<=to) {
          res = {
            apparent_temperature: forecast.hourly.apparent_temperature[idx],
            precipitation: forecast.hourly.precipitation[idx],
            precipitation_probability: forecast.hourly.precipitation_probability[idx],
            temperature_2m: forecast.hourly.temperature_2m[idx],
            time: forecast.hourly.time[idx],
          };
        }
      }
    })
    return res;
  }

  getGeolocation(locationName: string): Observable<LocationInterface[]> {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?name=';
    return this.http.get<{generationtime_ms: number, results: LocationInterface[]}>(url + locationName).pipe(map((_res) => {
      return _res.results
    }));
  }

  getTemperatureColor(temp: number): string {
    const colors: string[] = ['#264CFF','#3FA0FF','#72D8FF','#AAF7FF','#E0FFFF','#FFFFBF','#FFE099','#FFAD72','#F76D5E','#D82632','#A50021'];
    let colIdx: number = 0;
    if (temp<-20) {
      colIdx = 0;
    } else if (temp>=-20 && temp<-15) {
      colIdx = 1;
    } else if (temp>=-15 && temp<-10) {
      colIdx = 2;
    } else if (temp>=-10 && temp<-5) {
      colIdx = 3;
    } else if (temp>=-5 && temp<0) {
      colIdx = 4;
    } else if (temp>=0 && temp<5) {
      colIdx = 5;
    } else if (temp>=5 && temp<10) {
      colIdx = 6;
    } else if (temp>=10 && temp<15) {
      colIdx = 7;
    } else if (temp>=15 && temp<20) {
      colIdx = 8;
    } else if (temp>=20 && temp<25) {
      colIdx = 9;
    } else if (temp>=25) {
      colIdx = 10;
    }
    return colors[colIdx];
  }
}
