import { Injectable } from '@angular/core';
import { LocationInterface } from '../model/interfaces/location.interface';

@Injectable({
  providedIn: 'root'
})
export class LocationsService {

  constructor() { }

  getLocationName(location: LocationInterface, administrativeInfo?: boolean): string {
    if (!administrativeInfo) {
      return location.name;
    } else {
      return location.name;
    }
  }
}
