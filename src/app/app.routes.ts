import { Routes } from '@angular/router';

// Every page is lazy-loaded. Pages not built yet show the coming-soon placeholder; the data says which
// phase of docs/BUILD_PLAN.md builds them. Replace a placeholder with its feature component in that phase.
const comingSoon = () =>
  import('./shared/components/coming-soon/coming-soon.component').then((module) => module.ComingSoonComponent);

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
    loadComponent: comingSoon,
    title: 'Study · StudyTrack',
    data: { heading: 'Flashcards', phase: 4, summary: 'Flashcards for items due today, rated Again, Hard, Good or Easy.' },
  },
  {
    path: 'import',
    loadComponent: comingSoon,
    title: 'Import · StudyTrack',
    data: { heading: 'Import notes', phase: 5, summary: 'Upload a Word, PDF, Markdown or text file and review the questions the LLM extracts.' },
  },
  {
    path: 'search',
    loadComponent: comingSoon,
    title: 'Search · StudyTrack',
    data: { heading: 'Search', phase: 6, summary: 'Full-text search across all your items.' },
  },
  {
    path: 'settings',
    loadComponent: comingSoon,
    title: 'Settings · StudyTrack',
    data: { heading: 'Settings', phase: 5, summary: 'LLM provider and model, connection test, and theme.' },
  },
  { path: '**', redirectTo: 'dashboard' },
];
