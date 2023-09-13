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
    return this.http.get<ForecastInterface>(url + query + `&start_date=${dateFrom}&end_date=${dateTo}&hourly=windspeed_10m`);
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
            windspeed_10m: forecast.hourly.windspeed_10m[idx],
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

  getPrecipitationColor(precipitation: number): string {
    const colors: string[] = ['#ffffff','#9b78ff','#6f4ec2','#442788','#190253'];
    let colIdx: number = 0;
    if (precipitation===0) {
      colIdx = 0;
    } else if (precipitation>0 && precipitation<=10) {
      colIdx = 1;
    } else if (precipitation>10 && precipitation<=20) {
      colIdx = 2;
    } else if (precipitation>30 && precipitation<=40) {
      colIdx = 3;
    } else if (precipitation>40 && precipitation<=50) {
      colIdx = 4;
    }
    return colors[colIdx];
  }

  getWindSpeedColor(speed: number): string {
    const colors: string[] = ['#f288fc','#df7bec','#cd6fdd','#bb63cd','#a957be','#974baf','#863fa0','#763391','#652883','#551d74','#451166', '#360558'];
    let colIdx: number = 0;
    if (speed===0) {
      colIdx = 0;
    } else if (speed>0 && speed<=10) {
      colIdx = 1;
    } else if (speed>10 && speed<=20) {
      colIdx = 2;
    } else if (speed>20 && speed<=30) {
      colIdx = 3;
    } else if (speed>30 && speed<=40) {
      colIdx = 4;
    } else if (speed>40 && speed<=50) {
      colIdx = 5;
    } else if (speed>50 && speed<=60) {
      colIdx = 6;
    } else if (speed>60 && speed<=70) {
      colIdx = 7;
    } else if (speed>70 && speed<=80) {
      colIdx = 8;
    } else if (speed>80 && speed<=90) {
      colIdx = 9;
    } else if (speed>90 && speed<100) {
      colIdx = 10;
    } else if (speed>100) {
      colIdx = 11;
    }
    return colors[colIdx];
  }
}
