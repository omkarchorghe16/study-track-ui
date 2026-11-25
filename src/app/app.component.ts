import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  // Angular 22 defaults to OnPush; an OnPush root that is never marked dirty stops change detection
  // from reaching routed pages, so the root stays Eager (as in Folio Pro).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent {}
