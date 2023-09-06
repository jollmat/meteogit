import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgSelectModule } from '@ng-select/ng-select';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ForecastWidgetComponent } from './components/views/forecast-widget/forecast-widget.component';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { HighchartsChartModule } from 'highcharts-angular';
import { DragulaModule } from 'ng2-dragula';
import { ForecastComparisonWidgetComponent } from './components/views/forecast-comparison-widget/forecast-comparison-widget.component';
import { DeviceDetectorService } from 'ngx-device-detector';

@NgModule({
  declarations: [
    AppComponent,
    ForecastWidgetComponent,
    ForecastComparisonWidgetComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    AccordionModule,
    BrowserAnimationsModule,
    NgbDropdownModule,
    HighchartsChartModule,
    DragulaModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
