import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DragulaService } from 'ng2-dragula';
import { debounceTime, distinctUntilChanged, filter, fromEvent, Subscription, switchMap, tap } from 'rxjs';
import { ForecastComparisonWidgetComponent } from './components/views/forecast-comparison-widget/forecast-comparison-widget.component';
import { ForecastInterface } from './model/interfaces/forecast.interface';
import { LocationInterface } from './model/interfaces/location.interface';
import { MeteoService } from './services/meteo.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  
  title = 'meteo';

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
    blocks: string[]
  } = {
    field: undefined,
    dir: undefined,
    blocks: [
      'temperature',
      'apparent-temperature',
      'precipitation',
      'precipitation-probability'
    ]
  }

  dragDropSubs = new Subscription();
  searchTextSubs = new Subscription();
  getForecastSubs?: Subscription;
  geolocationSubs?: Subscription;

  constructor(
    private meteoService: MeteoService,
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

  sortBy(fieldName: string, sortDir?: 'ASC' | 'DESC') {
    this.sortConfig = {
      dir: sortDir || ((this.sortConfig.field!==fieldName)? 'ASC' : ((this.sortConfig.dir==='ASC')? 'DESC' : 'ASC')),
      field: fieldName,
      blocks: this.sortConfig.blocks
    }
    this.selectedLocations = this.selectedLocations.sort((a, b) => {
      let valA, valB;
      const forecastA: { locationId: number, locationName: string, forecast: ForecastInterface } | undefined = this.forecasts.find((_f) => _f.locationId===a.id);
      const forecastB: { locationId: number, locationName: string, forecast: ForecastInterface } | undefined = this.forecasts.find((_f) => _f.locationId===b.id);

      if (forecastA && forecastB) {
        switch(fieldName) {
          case 'location':
            valA = a.name;
            valB = b.name;
            break;
          case 'temperature':
            valA = this.meteoService.getCurrentHourlyForecast(forecastA.forecast)?.temperature_2m;
            valB = this.meteoService.getCurrentHourlyForecast(forecastB.forecast)?.temperature_2m;
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
    localStorage.setItem('locationsSortDir', this.sortConfig.dir || 'ASC');

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
      this.searchInput.nativeElement.select();
      localStorage.setItem('locations', JSON.stringify(this.selectedLocations));
      if (this.comparisonWidget) {
        //this.comparisonWidget.configCharts();
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
        this.sortBy(this.sortConfig.field, this.sortConfig.dir);
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
    return this.forecasts.find((_forecast) => _forecast.locationId===locationId)?.forecast;
  }

  ngOnInit(): void {
    const storedLocations: string | null = localStorage.getItem('locations');
    if (storedLocations) {
      this.selectedLocations = JSON.parse(storedLocations);
      this.selectedLocations.forEach((_location) => {
        this.loadForecast(_location, 'ngOnInit()');
      });

      const storedSortField: string | null = localStorage.getItem('locationsSortBy');
      const storedSortDir: 'ASC' | 'DESC' | null = localStorage.getItem('locationsSortDir') as 'ASC' | 'DESC' | null;
      if (storedSortField && storedSortDir) {
        this.sortConfig = {
          dir: storedSortDir as 'ASC' | 'DESC',
          field: storedSortField,
          blocks: this.sortConfig.blocks
        }
        this.sortBy(storedSortField, storedSortDir);
      }
    }

    setInterval(() => {
      this.reloadForecasts();
    }, 60*5000);
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
  }
}
