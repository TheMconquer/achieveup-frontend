import { Home, BookOpen, Sparkles, Award, Video } from 'lucide-react';
import { NavigationItem } from './types';

const instructorNavigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/instructor-dashboard',
    icon: Home,
  },
  {
    name: 'Skill Matrix',
    href: '/skill-matrix',
    icon: Sparkles,
  },
  {
    name: 'Skill Assignment',
    href: '/skill-assignment',
    icon: BookOpen,
  },
  {
    name: 'Skill Video Assignment',
    href: '/skill-videos',
    icon: Video,
  },
  {
    name: 'Student Progress',
    href: '/progress',
    icon: Award,
  },
];

const studentNavigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/student-dashboard',
    icon: Home,
  },
  {
    name: 'Courses',
    href: '/courses',
    icon: BookOpen,
  },
  {
    name: 'Skills',
    href: '/skills',
    icon: Sparkles,
  },
  {
    name: 'Skill Videos',
    href: '/my-skill-videos',
    icon: Video,
  },
  {
    name: 'Badges',
    href: '/badges',
    icon: Award,
  },
];

export function getNavigationItems(displayAsInstructor: boolean): NavigationItem[] {
  return displayAsInstructor ? instructorNavigationItems : studentNavigationItems;
}
