import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ForecastInterface, WeatherForecastHourly, WeatherForecastHourlyUnit } from 'src/app/model/interfaces/forecast.interface';
import { LocationInterface } from 'src/app/model/interfaces/location.interface';

import moment from 'moment-timezone';
import { MeteoService } from 'src/app/services/meteo.service';

import * as Highcharts from 'highcharts';
import { ChartsService } from 'src/app/services/charts.service';

@Component({
  selector: 'app-forecast-widget',
  templateUrl: './forecast-widget.component.html',
  styleUrls: ['./forecast-widget.component.scss']
})
export class ForecastWidgetComponent implements OnInit {

  @Input() location?: LocationInterface;
  @Input() forecast?: ForecastInterface;
  @Input() blocksSort?: string[];

  @Output() onRemove: EventEmitter<number> = new EventEmitter();

  Highcharts: typeof Highcharts = Highcharts;
  chartTemperatureOptions: Highcharts.Options = {};
  chartApparentTemperatureOptions: Highcharts.Options = {};
  chartPrecipitationOptions: Highcharts.Options = {};
  chartPrecipitationProbabilityOptions: Highcharts.Options = {};

  collapsed: boolean = true;

  bgIndex: number = 0;

  currentForecast!: WeatherForecastHourlyUnit;

  constructor(
    private meteoService: MeteoService,
    private chartService: ChartsService
    ) { }

  removeLocation() {
    this.onRemove.emit(this.location?.id);
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  getRandomBgIndex(): number {
    const min: number = 1;
    const max: number = 6;
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  getCurrentLocaleHour(): string {
    if (!this.location?.timezone) {
      return '-';
    }
    return moment.tz(new Date(),this.location?.timezone).format('HH:mm'); ;
  }

  getTemperatureColor(temp: number): string {
    return this.meteoService.getTemperatureColor(temp);
  }

  configCharts(): void {
    if (this.forecast && this.location) {
      this.chartTemperatureOptions = this.chartService.getForecastChart(this.forecast, 'temperature', this.location);
      this.chartApparentTemperatureOptions = this.chartService.getForecastChart(this.forecast, 'apparent-temperature', this.location);
      this.chartPrecipitationOptions = this.chartService.getForecastChart(this.forecast, 'precipitation', this.location);
      this.chartPrecipitationProbabilityOptions = this.chartService.getForecastChart(this.forecast, 'precipitation-probability', this.location);
    }
  }

  ngOnInit(): void {
    this.bgIndex = this.getRandomBgIndex();
    if (this.forecast) {
      this.configCharts();
      const currentForecast = this.meteoService.getCurrentHourlyForecast(this.forecast);
      if (currentForecast) {
        this.currentForecast = currentForecast;
      }
    } else {
      console.log('No forecast');
    }
  }

}
