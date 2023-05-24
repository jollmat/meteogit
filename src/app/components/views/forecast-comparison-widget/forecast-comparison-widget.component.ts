import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import Highcharts, { Chart } from 'highcharts';
import { ForecastInterface, WeatherForecastHourlyUnit } from 'src/app/model/interfaces/forecast.interface';
import { LocationInterface } from 'src/app/model/interfaces/location.interface';
import { ChartsService } from 'src/app/services/charts.service';
import { MeteoService } from 'src/app/services/meteo.service';

@Component({
  selector: 'app-forecast-comparison-widget',
  templateUrl: './forecast-comparison-widget.component.html',
  styleUrls: ['./forecast-comparison-widget.component.scss']
})
export class ForecastComparisonWidgetComponent implements OnInit, OnChanges {

  @Input() locations?: LocationInterface[];
  @Input() locationsForecasts?: { locationId: number, locationName: string, forecast: ForecastInterface }[];
  @Input() blocksSort?: string[];

  forecasts: (ForecastInterface | undefined)[] = [];

  Highcharts: typeof Highcharts = Highcharts;
  chartTemperatureOptions?: Highcharts.Options = {};
  chartApparentTemperatureOptions?: Highcharts.Options = {};
  chartPrecipitationOptions?: Highcharts.Options = {};
  chartPrecipitationProbabilityOptions?: Highcharts.Options = {};

  @ViewChild('chartTemperature') chartTemperature!: Chart;
  @ViewChild('chartApparentTemperature') chartApparentTemperature!: Chart;
  @ViewChild('chartPrecipitation') chartPrecipitation!: Chart;
  @ViewChild('chartPrecipitationProbability') chartPrecipitationProbability!: Chart;

  collapsed: boolean = true;

  chartsConfigured: boolean = false;

  constructor(
    private meteoService: MeteoService,
    private chartService: ChartsService
  ) { }
  
  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  getTemperatureColor(temp: number): string {
    return this.meteoService.getTemperatureColor(temp);
  }

  configCharts(): void {
    
    if (this.locations && this.locationsForecasts && this.locations.length===this.locationsForecasts.length) {
      this.forecasts = [];
      /*
      console.log('configCharts()');
      console.log('locations', this.locations);
      console.log('locationsForecasts()', this.locationsForecasts);
      */
      this.locations?.forEach((_location) => {
        if (this.locationsForecasts?.find((_locationForecast) => _locationForecast.locationId===_location.id)?.forecast) {
          this.forecasts.push(this.locationsForecasts?.find((_locationForecast) => _locationForecast.locationId===_location.id)?.forecast);
        }
      });

      this.chartTemperatureOptions = undefined;
      this.chartApparentTemperatureOptions = undefined;
      this.chartPrecipitationOptions = undefined;
      this.chartPrecipitationProbabilityOptions = undefined;

      setTimeout(() => {
        if (!this.chartsConfigured) {
          this.chartTemperatureOptions = this.chartService.getForecastsChart(this.forecasts, this.locations || [], 'temperature');
          this.chartApparentTemperatureOptions = this.chartService.getForecastsChart(this.forecasts, this.locations || [], 'apparent-temperature');
          this.chartPrecipitationOptions = this.chartService.getForecastsChart(this.forecasts, this.locations || [], 'precipitation');
          this.chartPrecipitationProbabilityOptions = this.chartService.getForecastsChart(this.forecasts, this.locations || [], 'precipitation-probability');
        } else {
          this.chartTemperatureOptions = this.chartService.getForecastsChart(this.forecasts, this.locations || [], 'temperature');
          this.chartApparentTemperatureOptions = this.chartService.getForecastsChart(this.forecasts, this.locations || [], 'apparent-temperature');
          this.chartPrecipitationOptions = this.chartService.getForecastsChart(this.forecasts, this.locations || [], 'precipitation');
          this.chartPrecipitationProbabilityOptions = this.chartService.getForecastsChart(this.forecasts, this.locations || [], 'precipitation-probability');
  
          console.log('chartTemperatureOptions', this.chartTemperatureOptions);
        }
        this.chartsConfigured = true;
      }, 1000);
  
      
    }
    
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['location'] && !changes['location'].firstChange) {
      this.configCharts();
    }
  }

}
