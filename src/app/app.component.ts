import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DragulaService } from 'ng2-dragula';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, fromEvent, Subscription, switchMap, tap } from 'rxjs';
import { ForecastComparisonWidgetComponent } from './components/views/forecast-comparison-widget/forecast-comparison-widget.component';
import { ForecastInterface, WeatherForecastHourly, WeatherForecastHourlyUnit } from './model/interfaces/forecast.interface';
import { LocationInterface } from './model/interfaces/location.interface';
import { MeteoService } from './services/meteo.service';

import moment from 'moment-timezone';
import { DeviceDetectorService } from 'ngx-device-detector';
import { AlertLimits } from './globals';

import * as L from 'leaflet';
import { icon, Marker } from 'leaflet';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  
  title = 'meteo';

  isMobile!: boolean;

  viewType: 'WIDGETS' | 'TABLE' = 'WIDGETS';
  tableViewType: 'GENERAL' | 'TEMPERATURE' | 'APPARENT_TEMPERATURE' | 'PRECIPITATION' | 'PRECIPITATION_PROBABILITY' | 'WIND_SPEED' = 'GENERAL';
  tableColumnIndexFrom: number = -1;
  generalTableViewType: 'TABLE' | 'MAP' = 'TABLE';
  mapValueType: 'TEMPERATURE' | 'APPARENT_TEMPERATURE' | 'PRECIPITATION' | 'WIND_SPEED' = 'TEMPERATURE';

  @ViewChild('searchInput') searchInput!: ElementRef;

  @ViewChild('comparisonWidget') comparisonWidget!: ForecastComparisonWidgetComponent;

  forecastQuery: string = '';

  form: FormGroup = new FormGroup({
    locationSearch: new FormControl(null, [])
  });

  locations: LocationInterface[] = [];
  selectedLocations: LocationInterface[] = [];

  forecasts: { locationId: number, locationName: string, forecast: ForecastInterface }[] = [];

  sortConfig: {
    field: string | undefined,
    dir: 'ASC' | 'DESC' | undefined,
    dateStr: string | undefined,
    blocks: string[]
  } = {
    field: undefined,
    dir: undefined,
    dateStr: undefined,
    blocks: [
      'temperature',
      'apparent-temperature',
      'precipitation',
      'precipitation-probability',
      'wind-speed'
    ]
  }

  dragDropSubs = new Subscription();
  searchTextSubs = new Subscription();
  getForecastSubs?: Subscription;
  geolocationSubs?: Subscription;

  checkCurrentHourInterval: any;

  showAlerts: boolean = false;
  alertLimits = AlertLimits;

  dragableWidgetsSubs$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  dragableWidgets: boolean = false;

  selectedLocation?: number;

  map: any;
  mapMarkers: any[] = [];

  constructor(
    private meteoService: MeteoService,
    private deviceService: DeviceDetectorService,
    private dragulaService: DragulaService
    ) {
      this.dragDropSubs.add(this.dragulaService.drop("WIDGETS")
      .subscribe(({ name, el, target, source, sibling }) => {
        this.sortConfig.field = undefined;
        this.sortConfig.dir = undefined;
        localStorage.setItem('locations', JSON.stringify(this.selectedLocations));
        localStorage.removeItem('locationsSortBy');
        localStorage.removeItem('locationsSortDir');
      })
      );
    }

  setDragable(dragable: boolean) {
    this.dragableWidgetsSubs$.next(dragable);
  }

  sortBy(fieldName?: string, sortDir?: 'ASC' | 'DESC', dateStr?: string) {

    if (!fieldName) {
      fieldName = this.tableViewType.toLowerCase();
    }

    const dateIndex: number | undefined = dateStr && this.forecasts.length>0? this.forecasts[0].forecast.hourly.time.indexOf(dateStr) : undefined;
    if (dateIndex) { 
      sortDir = ((this.sortConfig.dateStr!==dateStr)? 'DESC' : ((this.sortConfig.dir==='ASC')? 'DESC' : 'ASC'));
    }    

    this.sortConfig = {
      dir: sortDir || ((this.sortConfig.field!==fieldName)? 'DESC' : ((this.sortConfig.dir==='ASC')? 'DESC' : 'ASC')),
      field: fieldName,
      dateStr: dateStr,
      blocks: this.sortConfig.blocks
    };

    this.selectedLocations = this.selectedLocations.sort((a, b) => {
      let valA, valB;
      const forecastA: { locationId: number, locationName: string, forecast: ForecastInterface } | undefined = this.forecasts.find((_f) => _f.locationId===a.id);
      const forecastB: { locationId: number, locationName: string, forecast: ForecastInterface } | undefined = this.forecasts.find((_f) => _f.locationId===b.id);

      if (forecastA && forecastB) {
        switch(fieldName) {
          case 'country':
            valA = a.country;
            valB = b.country;
            break;
          case 'location':
            valA = a.name;
            valB = b.name;
            break;
          case 'temperature':
            if (dateIndex) {
              valA = forecastA.forecast.hourly.temperature_2m[dateIndex];
              valB = forecastB.forecast.hourly.temperature_2m[dateIndex];
            } else {
              valA = this.meteoService.getCurrentHourlyForecast(forecastA.forecast)?.temperature_2m;
              valB = this.meteoService.getCurrentHourlyForecast(forecastB.forecast)?.temperature_2m;
            }
            break;
          case 'apparent_temperature':
            if (dateIndex) {
              valA = forecastA.forecast.hourly.apparent_temperature[dateIndex];
              valB = forecastB.forecast.hourly.apparent_temperature[dateIndex];
            } else {
              valA = this.meteoService.getCurrentHourlyForecast(forecastA.forecast)?.apparent_temperature;
              valB = this.meteoService.getCurrentHourlyForecast(forecastB.forecast)?.apparent_temperature;
            }
            break;
          case 'precipitation':
            if (dateIndex) {
              valA = forecastA.forecast.hourly.precipitation[dateIndex];
              valB = forecastB.forecast.hourly.precipitation[dateIndex];
            } else {
              valA = this.meteoService.getCurrentHourlyForecast(forecastA.forecast)?.precipitation;
              valB = this.meteoService.getCurrentHourlyForecast(forecastB.forecast)?.precipitation;
            }
            break;
          case 'precipitation_probability':
            if (dateIndex) {
              valA = forecastA.forecast.hourly.precipitation_probability[dateIndex];
              valB = forecastB.forecast.hourly.precipitation_probability[dateIndex];
            } else {
              valA = this.meteoService.getCurrentHourlyForecast(forecastA.forecast)?.precipitation_probability;
              valB = this.meteoService.getCurrentHourlyForecast(forecastB.forecast)?.precipitation_probability;
            }
            break;
          case 'wind_speed':
            if (dateIndex) {
              valA = forecastA.forecast.hourly.windspeed_10m[dateIndex];
              valB = forecastB.forecast.hourly.windspeed_10m[dateIndex];
            } else {
              valA = this.meteoService.getCurrentHourlyForecast(forecastA.forecast)?.windspeed_10m;
              valB = this.meteoService.getCurrentHourlyForecast(forecastB.forecast)?.windspeed_10m;
            }
            break;
        }
      }
      
      if (valA!=undefined && valB!=undefined) {
        if(this.sortConfig.dir==='ASC') {
          return valA>valB ? 1 : -1;
        } else {
          return valA>valB ? -1 : 1;
        }
      }
      return -1;
    });
    localStorage.setItem('locations', JSON.stringify(this.selectedLocations));
    localStorage.setItem('locationsSortBy', fieldName);
    if (dateStr) {
      localStorage.setItem('locationsSortDate', dateStr);
    } else {
      localStorage.removeItem('locationsSortDate');
    }
    
    localStorage.setItem('locationsSortDir', this.sortConfig.dir || 'DESC');

  }

  searchLocations() {
    if (this.searchInput.nativeElement.value.length>0) {
      this.geolocationSubs = this.meteoService.getGeolocation(this.searchInput.nativeElement.value).subscribe((_geolocations) => {
        this.locations = _geolocations || [];
      });
    } else {
      this.locations = [];
    }
  }

  addLocation(location: LocationInterface) {
    if (!this.selectedLocations.some((_loc) => _loc.id===location.id )) {
      this.selectedLocations.push(location);
      this.locations = [];
      this.loadForecast(location, 'addLocation()');
      this.searchInput.nativeElement.value='';
      this.searchInput.nativeElement.select();
      localStorage.setItem('locations', JSON.stringify(this.selectedLocations));
      if (this.comparisonWidget) {
        this.selectedLocations.forEach((_loc) => this.loadForecast(_loc, 'reloadForecasts()'));
      }
    }
  }

  removeLocation(locationId: number) {
    if (this.selectedLocations.some((_loc) => _loc.id===locationId )) {
      this.selectedLocations = this.selectedLocations.filter((_loc) => _loc.id!==locationId);
      this.forecasts = this.forecasts.filter((_forecast) => {
        return _forecast.locationId!==locationId;
      });
      localStorage.setItem('locations', JSON.stringify(this.selectedLocations));
      if (this.comparisonWidget) {
        //this.comparisonWidget.configCharts();
        this.selectedLocations.forEach((_loc) => this.loadForecast(_loc, 'reloadForecasts()'));
      }
    }
  }

  getNumAddableLocations(): number {
    return this.locations.filter((_loc) => {
      return !this.selectedLocations.some((_selLoc) => {
        return _selLoc.id===_loc.id;
      })
    }).length;
  }

  isAddedLocation(locationId: number) {
    return this.selectedLocations.some((_loc) => _loc.id===locationId)
  }

  loadForecast(location: LocationInterface, calledBy: string) {
    const query: string = `latitude=${location.latitude}&longitude=${location.longitude}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation`;
    this.getForecastSubs = this.meteoService.getForecast(query).subscribe((_forecast) => {
      const forecastItem: { locationId: number, locationName: string, forecast: ForecastInterface } | undefined = this.forecasts.find((_f) => { return _f.locationId===location.id});
      if (!forecastItem) {
        this.forecasts.push({
          locationId: location.id,
          locationName: location.name,
          forecast: _forecast
        });
        if (this.forecasts.length===1) {
          this.checkCurrentHour();
        }
        if (this.comparisonWidget) {
          this.comparisonWidget.configCharts();
        }
      } else {
        forecastItem.forecast = _forecast;
        if (this.comparisonWidget) {
          this.comparisonWidget.configCharts();
        }
      }
      if (this.sortConfig.field) {
        this.sortBy(this.sortConfig.field, this.sortConfig.dir, this.sortConfig.dateStr);
      }
    });
  }

  reloadForecasts() {
    if (this.selectedLocations.length > 0) {
      setTimeout(() => {
        this.selectedLocations.forEach((_loc) => this.loadForecast(_loc, 'reloadForecasts()'));
      });
    }
  }

  getForecast(locationId: number): ForecastInterface | undefined {
    const forecast: ForecastInterface | undefined = this.forecasts.find((_forecast) => _forecast.locationId===locationId)?.forecast;
    return forecast;
  }

  getCurrentForecast(forecast?: ForecastInterface): WeatherForecastHourlyUnit | undefined{
    if (!forecast) {
      return forecast;
    }
    return this.meteoService.getCurrentHourlyForecast(forecast);
  }

  getForecastValue(hourlyData?: WeatherForecastHourly, idx?: number): number {
    let res: number = 0;
    if (hourlyData && idx) {
      switch(this.tableViewType) {
        case 'TEMPERATURE': 
          res = hourlyData.temperature_2m[idx];
          break;
        case 'APPARENT_TEMPERATURE': 
          res = hourlyData.apparent_temperature[idx];
          break;
        case 'PRECIPITATION': 
          res = hourlyData.precipitation[idx];
          break;
        case 'PRECIPITATION_PROBABILITY': 
          res = hourlyData.precipitation_probability[idx];
          break;
        case 'WIND_SPEED': 
          res = hourlyData.windspeed_10m[idx];
          break;
      }
    }
    return res;
  }

  getCurrentTime(): string {
    return moment(new Date()).format('HH:00');
  }

  getDateStr(str: string): string {
    return moment(new Date(str)).format('HH:mm');
  }

  getLocationLocaleHour(location: LocationInterface): string {
    if (!location?.timezone) {
      return '-';
    }
    return moment.tz(new Date(),location?.timezone).format('HH:mm'); ;
  }

  checkCurrentHour() {
    if (this.selectedLocations?.length>0 && this.getForecast(this.selectedLocations[0].id)) {
      const locationForecast: ForecastInterface | undefined = this.getForecast(this.selectedLocations[0].id);
      if (locationForecast) {
        this.tableColumnIndexFrom = locationForecast.hourly.time.findIndex((_time) => {
          return _time.includes(moment(new Date()).format('yyyy-MM-DDTHH'));
        }) - 3;
      }
    }
  }

  getLocationsAlerts(): { location: LocationInterface, alerts: { type: string, value: number, time: string }[] }[] {
    if (this.forecasts.length===0 || this.forecasts.length!==this.selectedLocations.length) {
      return [];
    }
    let locationsAlerts: { location: LocationInterface, alerts: { type: string, value: number, time: string }[] }[] = [];
    
    this.selectedLocations.forEach((_location) => {
      let alerts: { type: string, value: number, time: string }[] = [];
      const forecast: ForecastInterface | undefined = this.getForecast(_location.id);

      if(forecast) {
        const forecastHourly: WeatherForecastHourly = forecast.hourly;
        const idx: number = this.tableColumnIndexFrom+3;

        if (forecastHourly.temperature_2m[idx]>=this.alertLimits.temperature.dangerHigh ||
            forecastHourly.temperature_2m[idx]<=this.alertLimits.temperature.dangerLow) {
            alerts.push({ type:'temperature', value: forecastHourly.temperature_2m[idx], time: forecastHourly.time[idx] });
        }
        if (forecastHourly.apparent_temperature[idx]>=this.alertLimits.temperature.dangerHigh ||
          forecastHourly.apparent_temperature[idx]<=this.alertLimits.temperature.dangerLow) {
          alerts.push({ type:'apparent_temperature', value: forecastHourly.apparent_temperature[idx], time: forecastHourly.time[idx] });
        }
        if (forecastHourly.precipitation[idx]>=this.alertLimits.precipitation.danger) {
          alerts.push({ type:'precipitation', value: forecastHourly.precipitation[idx], time: forecastHourly.time[idx] });
        }
        if (forecastHourly.windspeed_10m[idx]>=this.alertLimits.wind_speed.danger) {
          alerts.push({ type:'wind_speed', value: forecastHourly.windspeed_10m[idx], time: forecastHourly.time[idx] });
        }
      }
      if (alerts.length>0) {
        locationsAlerts.push({
          location: _location,
          alerts: alerts
        });
      }
      
    });
    return locationsAlerts.sort((a,b) => {
      return a.location.name>b.location.name ? 1 : -1;
    });
  }

  goToAlert(alertType: string, locationId: number, sortDir?: 'ASC' | 'DESC') {
    this.tableViewType='GENERAL';
    this.setSelectedLocation(locationId);
    this.sortBy(alertType, sortDir);
  }

  setSelectedLocation(locationId?: number) {
    this.selectedLocation = locationId;
  }

  toggleSelectedLocation(locationId: number) {
    this.setSelectedLocation((this.selectedLocation===locationId)? undefined : locationId);
  }

  initMap() {

    setTimeout(() => {

      if (!this.map) {
        this.map = L.map('map', {
          center: [48.20807,16.37320],
          attributionControl: false,
          zoom: 4
        });
    
        const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          minZoom: 3,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        });
  
        tiles.addTo(this.map);
      } else {
        this.mapMarkers.forEach((_marker) => {
          this.map.removeLayer(_marker)
        });
        this.mapMarkers = [];
      }      

      this.selectedLocations.forEach((_location) => {
        const lat = _location.latitude;
        const lng = _location.longitude;

        const locationForecasts: ForecastInterface | undefined = this.getForecast(_location.id);
        const forecast = this.getCurrentForecast(locationForecasts);

        let iconHtml = '';

        switch(this.mapValueType) {
          case 'TEMPERATURE':
            iconHtml = "<div title=\""+_location.name+"\" style='background-color:"+this.getTemperatureColor((forecast) ? forecast.temperature_2m : 0)+";color:white;text-align:center;border-radius:25px;padding: 5px 3px;position: relative;top: 20px;' class='marker-pin'>"+((forecast) ? forecast.temperature_2m : 0)+"</div>";
            break;
          case 'APPARENT_TEMPERATURE':
            iconHtml = "<div title=\""+_location.name+"\" style='background-color:"+this.getTemperatureColor((forecast) ? forecast.apparent_temperature : 0)+";color:white;text-align:center;border-radius:25px;padding: 5px 3px;position: relative;top: 20px;' class='marker-pin'>"+((forecast) ? forecast.apparent_temperature : 0)+"</div>";
            break;
          case 'PRECIPITATION':
            iconHtml = "<div title=\""+_location.name+"\" style='color:blue;background-color:"+this.getPrecipitationColor((forecast) ? forecast.precipitation : 0)+";text-align:center;border-radius:25px;padding: 5px 3px;position: relative;top: 20px;' class='marker-pin'>"+((forecast) ? forecast.precipitation : 0)+"</div>";
            break;
          case 'WIND_SPEED':
            iconHtml = "<div title=\""+_location.name+"\" style='background-color:"+this.getWindSpeedColor((forecast) ? forecast.windspeed_10m : 0)+";color:white;text-align:center;border-radius:25px;padding: 5px 3px;position: relative;top: 20px;' class='marker-pin'>"+((forecast) ? forecast.windspeed_10m : 0)+"</div>";
            break;
        }
   
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: iconHtml,
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        });

        const marker = L.marker([lat, lng], { icon: icon });
        this.mapMarkers.push(marker);
        marker.addTo(this.map);
      });      

      
    }, 1000);    
  }

  private getTemperatureColor(temp: number): string {
    return this.meteoService.getTemperatureColor(temp);
  }

  private getPrecipitationColor(precipitation: number): string {
    return this.meteoService.getPrecipitationColor(precipitation);
  }

  private getWindSpeedColor(windSpeed: number): string {
    return this.meteoService.getWindSpeedColor(windSpeed);
  }

  ngOnInit(): void {

    this.isMobile = this.deviceService.isMobile();

    this.viewType = this.isMobile ? 'WIDGETS' : 'TABLE';

    const storedLocations: string | null = localStorage.getItem('locations');
    if (storedLocations) {
      this.selectedLocations = JSON.parse(storedLocations);
      this.selectedLocations.forEach((_location) => {
        this.loadForecast(_location, 'ngOnInit()');
      });

      const storedSortField: string | null = localStorage.getItem('locationsSortBy');
      const storedSortDir: 'ASC' | 'DESC' | null = localStorage.getItem('locationsSortDir') as 'ASC' | 'DESC' | null;
      const storedSortDate: string | null = localStorage.getItem('locationsSortDate');
      if (storedSortField && storedSortDir) {
        this.sortConfig = {
          dir: storedSortDir as 'ASC' | 'DESC',
          field: storedSortField,
          dateStr: storedSortDate || undefined,
          blocks: this.sortConfig.blocks
        }
        this.sortBy(this.sortConfig.field, this.sortConfig.dir, this.sortConfig.dateStr);
      }
    }

    this.dragableWidgetsSubs$.subscribe((_dragable) => {
      this.dragableWidgets = _dragable;
    });

    this.setDragable(false);

    setInterval(() => {
      this.reloadForecasts();
    }, 60*1000*5);

    this.checkCurrentHourInterval = setInterval(() => {
      this.checkCurrentHour();
    }, 1000*5);
  }

  ngAfterViewInit() {
    this.searchTextSubs = fromEvent(this.searchInput.nativeElement,'keyup')
        .pipe(
            filter(Boolean),
            debounceTime(300),
            distinctUntilChanged(),
            tap((text) => {
              this.searchLocations();
            })
        )
        .subscribe();
  }

  ngOnDestroy(): void {
    if (this.dragDropSubs) this.dragDropSubs.unsubscribe();
    if (this.searchTextSubs) this.searchTextSubs.unsubscribe();
    if (this.getForecastSubs) this.getForecastSubs.unsubscribe();
    if (this.geolocationSubs) this.geolocationSubs.unsubscribe();
    if (this.checkCurrentHourInterval) clearInterval(this.checkCurrentHourInterval)
  }
}
