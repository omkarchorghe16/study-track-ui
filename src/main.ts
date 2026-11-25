import { provideHttpClient } from '@angular/common/http';
import { inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { ThemeService } from './app/core/services/theme.service';

bootstrapApplication(AppComponent, {
  providers: [
    // Same setup as Folio Pro: zone-based change detection, so components that update plain fields
    // inside HTTP callbacks still render. New components use signals and do not depend on it.
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    // Route params and route data are bound to component inputs of the same name.
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => inject(ThemeService).applyStoredTheme()),
  ],
}).catch((err) => console.error(err));
