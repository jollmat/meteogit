import { Injectable } from '@angular/core';
import { ChartOptions, SeriesOptionsType } from 'highcharts';
import { ForecastInterface } from '../model/interfaces/forecast.interface';
import { LocationInterface } from '../model/interfaces/location.interface';
import moment from 'moment-timezone';
import { time } from 'console';

@Injectable({
  providedIn: 'root'
})
export class ChartsService {

  constructor() { }

  getForecastChart(forecast: ForecastInterface, chartId: string, location: LocationInterface): Highcharts.Options {
    const nowDateLocale: Date = new Date();
    const now: moment.Moment = this.getCurrentLocaleHour(new Date(), location.timezone);
    const nowDate: Date = moment(now.format('DD/MM/YYYY HH:mm'), 'DD/MM/YYYY HH:mm').toDate();
    const startDate: Date = new Date(forecast.hourly.time[0]);
    let values: number[] = [];
    let yAxisTtitle: string = '';
    
    switch(chartId) {
      case 'temperature':
        values = forecast.hourly.temperature_2m;
        yAxisTtitle = forecast.hourly_units.temperature_2m;
        break;
      case 'apparent-temperature':
        values = forecast.hourly.apparent_temperature;
        yAxisTtitle = forecast.hourly_units.apparent_temperature;
        break;
      case 'precipitation':
        values = forecast.hourly.precipitation;
        yAxisTtitle = forecast.hourly_units.precipitation;
        break;
      case 'precipitation-probability':
        values = forecast.hourly.precipitation_probability;
        yAxisTtitle = forecast.hourly_units.precipitation_probability;
        break;
    }
    
    return {
      title: { text: '' },
      subtitle: { text: '' },
      yAxis: { title: { text: yAxisTtitle } },
      xAxis: {
        type: 'datetime',
        labels: { overflow: 'justify', rotation: 320 },
        tickInterval: 24 * 3600 * 1000,
        plotLines: [{
          color: '#FF0000',
          width: 2,
          value: Date.UTC(nowDateLocale.getFullYear(), nowDateLocale.getMonth(), nowDateLocale.getDate(), nowDateLocale.getHours(), nowDateLocale.getMinutes())
        }]
      },
      tooltip: {
        valueSuffix: ' ' + yAxisTtitle,
        pointFormat: '{series.name}: <b>{point.y}</b><br/>'
      },
      legend: { enabled: false },
      series: [{
          name: chartId.charAt(0).toUpperCase() + chartId.slice(1).replace(/-/gi, ' '),
          type: 'spline',
          data: values,
          pointStart: Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
          pointInterval: 3600 * 1000
      }],
      credits: { enabled: false }
    };
  }

  getForecastsChart(forecasts: (ForecastInterface | undefined)[], locations: LocationInterface[], chartId: string): Highcharts.Options {
    const now: Date = new Date();
    const startDate: Date = forecasts[0] ? new Date(forecasts[0].hourly.time[0]) : new Date();
    let values: number[][] = [];

    let yAxisTtitle: string = '';
    
    forecasts.forEach((forecast) => {
      if (forecast) {
        switch(chartId) {
          case 'temperature':
            values.push(forecast.hourly.temperature_2m);
            yAxisTtitle = forecast.hourly_units.temperature_2m;
            break;
          case 'apparent-temperature':
            values.push(forecast.hourly.apparent_temperature);
            yAxisTtitle = forecast.hourly_units.apparent_temperature;
            break;
          case 'precipitation':
            values.push(forecast.hourly.precipitation);
            yAxisTtitle = forecast.hourly_units.precipitation;
            break;
          case 'precipitation-probability':
            values.push(forecast.hourly.precipitation_probability);
            yAxisTtitle = forecast.hourly_units.precipitation_probability;
            break;
        }
      }
    });

    const series: SeriesOptionsType[] = forecasts.map((_forecast, idx) => {
      return {
        name: locations[idx].name + ' (' + locations[idx].country_code + ')',
        type: 'spline',
        data: values[idx],
        pointStart: Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
        pointInterval: 3600 * 1000
      }
    });
    
    return {
      title: { text: '' },
      subtitle: { text: '' },
      yAxis: { title: { text: yAxisTtitle } },
      xAxis: {
        type: 'datetime',
        labels: { overflow: 'justify', rotation: 320 },
        tickInterval: 24 * 3600 * 1000,
        plotLines: [{
          color: '#FF0000',
          width: 2,
          value: Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes())
        }]
      },
      legend: {
        backgroundColor: 'transparent',
        align: 'right',
        verticalAlign: 'top',
        floating: true,
        y: -15
      },
      tooltip: {
        shared: true,
        valueSuffix: ' ' + yAxisTtitle,
        pointFormat: '{series.name}: <b>{point.y}</b><br/>'
      },
      series: series,
      credits: { enabled: false }
    };
  }

  private getCurrentLocaleHour(date: Date, timezone: string): moment.Moment {
    // return moment().tz(timezone);
    return moment.tz(moment(date), timezone).utc(true);
  }

}
