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
    loadComponent: comingSoon,
    title: 'Subjects · StudyTrack',
    data: { heading: 'Subjects', phase: 2, summary: 'Subject cards with progress, and a dialog to create or edit a subject.' },
  },
  {
    path: 'subjects/:id',
    loadComponent: comingSoon,
    title: 'Subject · StudyTrack',
    data: { heading: 'Subject', phase: 2, summary: 'Topic tree on the left, items with filters on the right, and "Mark topic complete".' },
  },
  {
    path: 'items/new',
    loadComponent: comingSoon,
    title: 'New item · StudyTrack',
    data: { heading: 'New item', phase: 2, summary: 'Rich text editor for the question, answer and notes.' },
  },
  {
    path: 'items/:id/edit',
    loadComponent: comingSoon,
    title: 'Edit item · StudyTrack',
    data: { heading: 'Edit item', phase: 2, summary: 'Rich text editor for the question, answer and notes.' },
  },
  {
    path: 'items/:id',
    loadComponent: comingSoon,
    title: 'Item · StudyTrack',
    data: { heading: 'Item', phase: 2, summary: 'Reading view with the answer, notes, status buttons and previous/next.' },
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
