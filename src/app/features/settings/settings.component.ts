import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LLM_PROVIDER_LABELS, LlmConnectionTest, LlmProvider, LlmProviderInfo, LlmSettingsRequest } from '../../core/models/llm-settings.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { SettingsService } from '../../core/services/settings.service';
import { ShellComponent } from '../../shared/components/shell/shell.component';

/**
 * LLM settings for imports (`/settings`): provider, model, base URL and on/off, with a connection test.
 * API keys are never entered here; the page only shows whether the server has one.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ShellComponent, FormsModule],
  template: `
    <app-shell>
      <section class="page-shell">
        <header class="page-header">
          <div>
            <h1>Settings</h1>
            <p>Choose the LLM that reads your imported notes.</p>
          </div>
        </header>

        @if (loadError()) {
          <p class="load-error" role="alert">{{ loadError() }} <button type="button" class="btn btn-small" (click)="loadSettings()">Retry</button></p>
        } @else if (loading()) {
          <p class="text-muted" role="status">Loading settings…</p>
        } @else {
          <form class="card settings-card" (ngSubmit)="save()">
            <h2>LLM for imports</h2>
            @if (saveError()) { <p class="form-error" role="alert">{{ saveError() }}</p> }
            <div class="field-row">
              <label class="field"><span>Provider</span>
                <select name="provider" [ngModel]="provider()" (ngModelChange)="changeProvider($event)">
                  @for (option of providers(); track option.provider) {
                    <option [ngValue]="option.provider">{{ providerLabels[option.provider] }}</option>
                  }
                </select>
              </label>
              <label class="field"><span>Model</span>
                <input name="model" [(ngModel)]="model" required maxlength="100" autocomplete="off" [placeholder]="providerInfo()?.defaultModel ?? ''">
              </label>
            </div>
            <label class="field"><span>Base URL</span>
              <input name="baseUrl" type="url" [(ngModel)]="baseUrl" maxlength="500" autocomplete="off" [placeholder]="providerInfo()?.defaultBaseUrl ?? ''">
              <span class="field-hint">Leave blank for {{ providerInfo()?.defaultBaseUrl ?? 'the default' }}.</span>
            </label>
            <p class="key-status" [class.missing]="keyMissing()">
              @if (!providerInfo()?.apiKeyRequired) {
                No API key needed. The model must be pulled on the Ollama server.
              } @else if (providerInfo()?.apiKeyConfigured) {
                API key is set on the server.
              } @else {
                No API key on the server. Set {{ provider() === 'OPENAI' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY' }} in the API's environment or .env, then restart it.
              }
            </p>
            <label class="check"><input type="checkbox" name="enabled" [(ngModel)]="enabled"> Imports enabled</label>

            @if (testResult(); as result) {
              <p [class]="result.ok ? 'test-ok' : 'form-error'" role="status">{{ result.ok ? '✓' : '✕' }} {{ result.message }}</p>
            }
            @if (savedMessage()) { <p class="test-ok" role="status">{{ savedMessage() }}</p> }
            <div class="actions-row">
              <button type="submit" class="btn btn-primary" [disabled]="saving() || !model.trim()">{{ saving() ? 'Saving…' : 'Save' }}</button>
              <button type="button" class="btn" [disabled]="testing() || !model.trim()" (click)="testConnection()">
                {{ testing() ? 'Testing…' : 'Test connection' }}
              </button>
            </div>
          </form>
          <p class="text-muted note">Theme settings come with Phase 6.</p>
        }
      </section>
    </app-shell>
  `,
  styles: [`
    .settings-card{max-width:640px;padding:18px}h2{margin:0 0 14px;font-size:1rem}
    .key-status{margin:0 0 14px;font-size:.8rem;color:#56d69c}.key-status.missing{color:#f2ca63}
    .check{display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:.84rem}
    .test-ok{color:#56d69c;font-size:.82rem}.note{font-size:.78rem}
  `],
})
export class SettingsComponent {
  private readonly settingsService = inject(SettingsService);

  protected readonly providerLabels = LLM_PROVIDER_LABELS;
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly providers = signal<LlmProviderInfo[]>([]);
  protected readonly provider = signal<LlmProvider>('ANTHROPIC');
  protected readonly providerInfo = computed(() => this.providers().find((option) => option.provider === this.provider()) ?? null);
  protected readonly keyMissing = computed(() => {
    const info = this.providerInfo();
    return info !== null && info.apiKeyRequired && !info.apiKeyConfigured;
  });
  protected model = '';
  protected baseUrl = '';
  protected enabled = true;

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);
  protected readonly testing = signal(false);
  protected readonly testResult = signal<LlmConnectionTest | null>(null);

  constructor() {
    this.loadSettings();
  }

  protected loadSettings(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.settingsService.getLlmSettings().subscribe({
      next: (settings) => {
        this.providers.set(settings.providers);
        this.provider.set(settings.provider);
        this.model = settings.model;
        this.baseUrl = settings.baseUrl;
        this.enabled = settings.enabled;
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(apiErrorMessage(error, 'Could not load the settings.'));
      },
    });
  }

  /** A new provider starts from its own default model and base URL. */
  protected changeProvider(provider: LlmProvider): void {
    this.provider.set(provider);
    const info = this.providerInfo();
    this.model = info?.defaultModel ?? '';
    this.baseUrl = info?.defaultBaseUrl ?? '';
    this.testResult.set(null);
    this.savedMessage.set(null);
  }

  protected save(): void {
    if (this.saving() || !this.model.trim()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.savedMessage.set(null);
    this.settingsService.replaceLlmSettings(this.buildRequest()).subscribe({
      next: (settings) => {
        this.saving.set(false);
        this.model = settings.model;
        this.baseUrl = settings.baseUrl;
        this.savedMessage.set('Settings saved.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveError.set(apiErrorMessage(error, 'Could not save the settings.'));
      },
    });
  }

  /** Tests what is on the form, saved or not. */
  protected testConnection(): void {
    this.testing.set(true);
    this.testResult.set(null);
    this.settingsService.testLlmConnection(this.buildRequest()).subscribe({
      next: (result) => {
        this.testing.set(false);
        this.testResult.set(result);
      },
      error: (error: unknown) => {
        this.testing.set(false);
        this.testResult.set({ ok: false, message: apiErrorMessage(error, 'Could not test the connection.'), provider: this.provider(), model: this.model });
      },
    });
  }

  private buildRequest(): LlmSettingsRequest {
    return { provider: this.provider(), model: this.model.trim(), baseUrl: this.baseUrl.trim() || null, enabled: this.enabled };
  }
}
