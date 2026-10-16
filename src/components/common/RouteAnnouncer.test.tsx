import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import RouteAnnouncer, { pageTitleFor } from './RouteAnnouncer';

let navigateTo: (path: string) => void = () => {};
const NavigateGrabber: React.FC = () => {
  navigateTo = useNavigate();
  return null;
};

describe('RouteAnnouncer', () => {
  test('maps routes to page titles, most specific prefix first', () => {
    expect(pageTitleFor('/courses/123')).toBe('Course Details');
    expect(pageTitleFor('/courses')).toBe('My Courses');
    expect(pageTitleFor('/badges/share/abc')).toBe('Shared Badges');
    expect(pageTitleFor('/badges')).toBe('My Badges');
    expect(pageTitleFor('/nope')).toBeUndefined();
  });

  test('sets the document title and announces only client-side navigation', () => {
    render(
      <MemoryRouter initialEntries={['/skills']}>
        <RouteAnnouncer />
        <NavigateGrabber />
      </MemoryRouter>
    );
    expect(document.title).toBe('My Skills · AchieveUp');
    expect(screen.getByRole('status')).toHaveTextContent('');

    act(() => navigateTo('/settings'));
    expect(document.title).toBe('Settings · AchieveUp');
    expect(screen.getByRole('status')).toHaveTextContent('Settings page');
  });
});
