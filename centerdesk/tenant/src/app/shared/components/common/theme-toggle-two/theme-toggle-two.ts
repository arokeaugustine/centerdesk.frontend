import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle-two',
  imports: [],
  templateUrl: './theme-toggle-two.html',
})
export class ThemeToggleTwo {
  private readonly themeService = inject(ThemeService);

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
