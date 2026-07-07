import { Component } from '@angular/core';
import { NgClass } from '@angular/common';

type TabOption = 'optionOne' | 'optionTwo' | 'optionThree';

@Component({
  selector: 'app-chart-tab',
  imports: [NgClass],
  templateUrl: './chart-tab.html',
})
export class ChartTab {
  selected: TabOption = 'optionOne';

  setSelected(option: TabOption): void {
    this.selected = option;
  }

  getButtonClass(option: TabOption): string {
    return this.selected === option
      ? 'shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800'
      : 'text-gray-500 dark:text-gray-400';
  }
}
