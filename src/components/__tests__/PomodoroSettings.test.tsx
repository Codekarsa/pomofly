import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PomodoroSettingsProvider, usePomodoroSettings } from '@/app/contexts/PomodoroSettingsContext'
import SettingsModal from '../SettingsModal'
import PomodoroTimer from '../PomodoroTimer'

jest.mock('@/app/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
jest.mock('@/hooks/useGoogleAnalytics', () => ({ useGoogleAnalytics: () => ({ event: jest.fn() }) }))
jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: [], loading: false, incrementPomodoroSession: jest.fn(), startAllTimeTracking: jest.fn(), stopAllTimeTracking: jest.fn() })
}))
jest.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [] }) }))

function Settings() {
  const { settings, updateSettings } = usePomodoroSettings()
  const [open, setOpen] = React.useState(false)
  return <>
    <button onClick={() => setOpen(true)}>Settings</button>
    <SettingsModal isOpen={open} onClose={() => setOpen(false)} settings={settings} onSave={updateSettings} event={() => {}} />
  </>
}

function Timer() {
  const { settings, loaded } = usePomodoroSettings()
  return loaded ? <PomodoroTimer settings={settings} /> : null
}

it('shares saved settings between the modal and timer, including after reload', async () => {
  localStorage.clear()
  const user = userEvent.setup()
  const app = <PomodoroSettingsProvider><Settings /><Timer /></PomodoroSettingsProvider>
  const first = render(app)
  await user.click(screen.getByRole('button', { name: 'Settings' }))
  for (const [name, value] of [
    ['Focus duration (minutes)', '17'], ['Short break (minutes)', '3'],
    ['Long break (minutes)', '11'], ['Long break after (focus sessions)', '2']
  ]) {
    await user.clear(screen.getByLabelText(name))
    await user.type(screen.getByLabelText(name), value)
  }
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(screen.getByText('17:00')).toBeInTheDocument()
  first.unmount()
  render(app)
  expect(screen.getByText('17:00')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Settings' }))
  expect(screen.getByLabelText('Focus duration (minutes)')).toHaveValue(17)
  expect(screen.getByLabelText('Short break (minutes)')).toHaveValue(3)
  expect(screen.getByLabelText('Long break (minutes)')).toHaveValue(11)
  expect(screen.getByLabelText('Long break after (focus sessions)')).toHaveValue(2)
})
