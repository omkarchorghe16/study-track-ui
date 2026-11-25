import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavLink {
  path: string;
  label: string;
  icon: string;
}

/** Page frame for every product page: top bar with the main navigation and a right-hand tool rail. */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <a class="skip-link" href="#main-content">Skip to content</a>
    <div class="shell-layout">
      <header class="topbar">
        <a class="brand" routerLink="/dashboard"><span class="brand-mark" aria-hidden="true">✓</span><span>Study<b>Track</b></span></a>
        <nav class="primary-nav" aria-label="Main navigation">
          @for (link of links; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="active" ariaCurrentWhenActive="page">{{ link.label }}</a>
          }
        </nav>
      </header>
      <div class="workspace">
        <main id="main-content" class="main-panel" tabindex="-1"><ng-content></ng-content></main>
        <nav class="tool-rail" aria-label="Quick links">
          @for (link of links; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="active" [attr.aria-label]="link.label"><span aria-hidden="true">{{ link.icon }}</span><small aria-hidden="true">{{ link.label }}</small></a>
          }
        </nav>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:var(--bg);color:var(--text)}
    .topbar{height:54px;display:flex;align-items:center;gap:32px;padding:0 22px;background:var(--panel);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:5}
    .brand{display:flex;align-items:center;gap:8px;white-space:nowrap;font-weight:700;letter-spacing:2px;font-size:13px}.brand b{color:var(--primary);letter-spacing:0}
    .brand-mark{display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#ffca28;color:#151515;font-size:15px;font-weight:800}
    .primary-nav{display:flex;align-items:center;gap:22px;margin-left:auto}.primary-nav a{font-size:12px;color:#a6a6af;white-space:nowrap}
    .primary-nav a.active,.primary-nav a:hover,.tool-rail a.active,.tool-rail a:hover{color:#f3ce68}
    .workspace{display:grid;grid-template-columns:minmax(0,1fr) 58px;min-height:calc(100vh - 54px)}.main-panel{min-width:0;padding:24px clamp(18px,4vw,70px);outline:none}
    .tool-rail{position:sticky;top:54px;height:calc(100vh - 54px);display:flex;flex-direction:column;align-items:center;gap:15px;padding:25px 5px;background:var(--panel);border-left:1px solid var(--border)}
    .tool-rail a{display:grid;justify-items:center;gap:3px;color:#a4a4ab;font-size:17px}.tool-rail small{font-size:9px}
    @media(max-width:900px){.topbar{gap:12px;padding:0 14px}.primary-nav{gap:12px}.main-panel{padding:18px}.workspace{grid-template-columns:minmax(0,1fr) 48px}}
    @media(max-width:620px){.topbar{height:auto;min-height:54px;flex-wrap:wrap;padding:10px 12px}.primary-nav{order:3;overflow:auto;width:100%;margin:0;padding:4px 0}.workspace{grid-template-columns:1fr}.tool-rail{display:none}}
  `],
})
export class ShellComponent {
  protected readonly links: readonly NavLink[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '⌂' },
    { path: '/subjects', label: 'Subjects', icon: '☰' },
    { path: '/import', label: 'Import', icon: '⇪' },
    { path: '/search', label: 'Search', icon: '⌕' },
    { path: '/settings', label: 'Settings', icon: '⚙' },
  ];
}
