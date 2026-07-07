import { Component } from '@angular/core';
import { CountryMap } from '../country-map/country-map';
import { Dropdown } from '../../dropdown/dropdown';
import { DropdownItem } from '../../dropdown/dropdown-item/dropdown-item';

@Component({
  selector: 'app-demographic-card',
  imports: [CountryMap, Dropdown, DropdownItem],
  templateUrl: './demographic-card.html',
})
export class DemographicCard {
  isOpen = false;

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  countries = [
    { img: '/images/country/country-01.svg', alt: 'usa', name: 'USA', customers: '2,379 Customers', percent: 79 },
    { img: '/images/country/country-02.svg', alt: 'france', name: 'France', customers: '589 Customers', percent: 23 },
  ];
}
