import { Routes } from '@angular/router';

// Every page is lazy-loaded. A page that is planned but not built yet points at ComingSoonComponent
// (shared/components/coming-soon) with data { heading, phase, summary }.

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then((module) => module.DashboardComponent),
    title: 'Dashboard · StudyTrack',
  },
  {
    path: 'subjects',
    loadComponent: () => import('./features/subjects/subjects.component').then((module) => module.SubjectsComponent),
    title: 'Subjects · StudyTrack',
  },
  {
    path: 'subjects/:id',
    loadComponent: () => import('./features/subject-detail/subject-detail.component').then((module) => module.SubjectDetailComponent),
    title: 'Subject · StudyTrack',
  },
  {
    path: 'catalog',
    loadComponent: () => import('./features/catalog/catalog.component').then((module) => module.CatalogComponent),
    title: 'Catalog · StudyTrack',
  },
  {
    path: 'items/new',
    loadComponent: () => import('./features/item-editor/item-editor.component').then((module) => module.ItemEditorComponent),
    title: 'New item · StudyTrack',
  },
  {
    path: 'items/:id/edit',
    loadComponent: () => import('./features/item-editor/item-editor.component').then((module) => module.ItemEditorComponent),
    title: 'Edit item · StudyTrack',
  },
  {
    path: 'items/:id',
    loadComponent: () => import('./features/item-view/item-view.component').then((module) => module.ItemViewComponent),
    title: 'Item · StudyTrack',
  },
  {
    path: 'study/:subjectId',
    loadComponent: () => import('./features/study/study.component').then((module) => module.StudyComponent),
    title: 'Study · StudyTrack',
  },
  {
    path: 'import',
    loadComponent: () => import('./features/import/import.component').then((module) => module.ImportComponent),
    title: 'Import · StudyTrack',
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search.component').then((module) => module.SearchComponent),
    title: 'Search · StudyTrack',
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then((module) => module.SettingsComponent),
    title: 'Settings · StudyTrack',
  },
  { path: '**', redirectTo: 'dashboard' },
];
