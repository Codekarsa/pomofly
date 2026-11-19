import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskList from '../TaskList'

jest.mock('@/lib/firebase', () => ({ auth: { currentUser: null }, db: {} }))
jest.mock('@/app/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
jest.mock('@/hooks/useGoogleAnalytics', () => ({ useGoogleAnalytics: () => ({ event: jest.fn() }) }))

beforeAll(() => {
  Object.defineProperty(window, 'ResizeObserver', {
    value: class { observe() {} unobserve() {} disconnect() {} }
  })
  Element.prototype.scrollIntoView = jest.fn()
})

it('keeps creation project separate from list filtering and explains empty search results', async () => {
  localStorage.clear()
  localStorage.setItem('pomofly_guest_projects', JSON.stringify([
    { id: 'work', name: 'Work', userId: 'guest', createdAt: new Date() },
    { id: 'home', name: 'Personal', userId: 'guest', createdAt: new Date() },
  ]))
  localStorage.setItem('pomofly_guest_tasks', JSON.stringify([
    { id: 'draft', title: 'Draft launch email', projectId: 'work', createdAt: new Date(), completed: false },
    { id: 'shop', title: 'Buy groceries', projectId: 'home', createdAt: new Date(), completed: false },
  ]))
  const user = userEvent.setup()
  render(<TaskList />)
  await user.click(screen.getByRole('button', { name: 'Add Task' }))
  await user.click(screen.getByRole('combobox', { name: 'Project (required)' }))
  await user.click(screen.getByRole('option', { name: 'Personal' }))
  expect(screen.getByText('Draft launch email')).toBeVisible()
  expect(screen.getByText('Buy groceries')).toBeVisible()
  await user.type(screen.getByRole('textbox', { name: 'Search tasks' }), 'unmatched title')
  expect(screen.getByRole('status')).toHaveTextContent('No tasks match your search or filters')
  await user.clear(screen.getByRole('textbox', { name: 'Search tasks' }))
  expect(screen.getByText('Draft launch email')).toBeVisible()
  expect(screen.getByText('Buy groceries')).toBeVisible()
})
