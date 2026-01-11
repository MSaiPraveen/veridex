'use client';

import { useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/components/providers/theme-provider';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Icons;
}

const sections: SettingSection[] = [
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize how the dashboard looks',
    icon: 'sun',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure notification preferences',
    icon: 'bell',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Manage your account security',
    icon: 'shield',
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'General application settings',
    icon: 'settings',
  },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary-600' : 'bg-[var(--border)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('appearance');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [complianceAlerts, setComplianceAlerts] = useState(true);
  const [documentReminders, setDocumentReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Security settings
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');

  // Preference settings
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('America/New_York');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

  return (
    <DashboardLayout>
      <PageHeader
        title="Settings"
        description="Manage your account and application preferences"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-2">
            {sections.map((section) => {
              const IconComponent = Icons[section.icon];
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'hover:bg-[var(--background)] text-[var(--foreground-muted)]'
                  }`}
                >
                  <IconComponent size={18} />
                  <span className="font-medium">{section.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Appearance */}
          {activeSection === 'appearance' && (
            <div className="card">
              <div className="p-6 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Appearance</h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Customize the look and feel of the dashboard
                </p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">Theme</h3>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Switch between light and dark mode
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--foreground-muted)] capitalize">
                      {theme}
                    </span>
                    <button
                      onClick={toggleTheme}
                      className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                    >
                      {theme === 'light' ? (
                        <Icons.moon size={20} className="text-[var(--foreground-muted)]" />
                      ) : (
                        <Icons.sun size={20} className="text-[var(--foreground-muted)]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <h3 className="font-medium text-[var(--foreground)] mb-4">Theme Preview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => theme === 'dark' && toggleTheme()}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        theme === 'light'
                          ? 'border-primary-500 bg-white'
                          : 'border-[var(--border)] bg-white hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Icons.sun size={16} className="text-amber-500" />
                        <span className="text-sm font-medium text-gray-900">Light</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-200 rounded" />
                        <div className="h-2 bg-gray-200 rounded w-3/4" />
                      </div>
                    </button>
                    <button
                      onClick={() => theme === 'light' && toggleTheme()}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        theme === 'dark'
                          ? 'border-primary-500 bg-gray-900'
                          : 'border-[var(--border)] bg-gray-900 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Icons.moon size={16} className="text-blue-400" />
                        <span className="text-sm font-medium text-white">Dark</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-700 rounded" />
                        <div className="h-2 bg-gray-700 rounded w-3/4" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <div className="card">
              <div className="p-6 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Notifications</h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Configure how you receive notifications
                </p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">Email Notifications</h3>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Receive notifications via email
                    </p>
                  </div>
                  <Toggle enabled={emailNotifications} onChange={() => setEmailNotifications(!emailNotifications)} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">Push Notifications</h3>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Receive browser push notifications
                    </p>
                  </div>
                  <Toggle enabled={pushNotifications} onChange={() => setPushNotifications(!pushNotifications)} />
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <h3 className="font-medium text-[var(--foreground)] mb-4">Notification Types</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Compliance Alerts</p>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          Get notified about compliance status changes
                        </p>
                      </div>
                      <Toggle enabled={complianceAlerts} onChange={() => setComplianceAlerts(!complianceAlerts)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Document Reminders</p>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          Reminders for expiring documents
                        </p>
                      </div>
                      <Toggle enabled={documentReminders} onChange={() => setDocumentReminders(!documentReminders)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Marketing Emails</p>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          Receive updates about new features
                        </p>
                      </div>
                      <Toggle enabled={marketingEmails} onChange={() => setMarketingEmails(!marketingEmails)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div className="card">
              <div className="p-6 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Security</h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Manage your account security settings
                </p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">Two-Factor Authentication</h3>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Toggle enabled={twoFactor} onChange={() => setTwoFactor(!twoFactor)} />
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <h3 className="font-medium text-[var(--foreground)] mb-2">Session Timeout</h3>
                  <p className="text-sm text-[var(--foreground-muted)] mb-4">
                    Automatically log out after a period of inactivity
                  </p>
                  <select
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    className="input max-w-xs"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <h3 className="font-medium text-[var(--foreground)] mb-2">Password</h3>
                  <p className="text-sm text-[var(--foreground-muted)] mb-4">
                    Change your account password
                  </p>
                  <button className="btn btn-secondary">
                    <Icons.lock className="mr-2" size={16} />
                    Change Password
                  </button>
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <h3 className="font-medium text-[var(--foreground)] mb-2">Active Sessions</h3>
                  <p className="text-sm text-[var(--foreground-muted)] mb-4">
                    View and manage your active sessions
                  </p>
                  <div className="card p-4 bg-[var(--background)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icons.monitor size={20} className="text-[var(--foreground-muted)]" />
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">Current Session</p>
                          <p className="text-xs text-[var(--foreground-muted)]">Windows • Chrome • Active now</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400">
                        Current
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences */}
          {activeSection === 'preferences' && (
            <div className="card">
              <div className="p-6 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Preferences</h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  General application settings
                </p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="font-medium text-[var(--foreground)] mb-2">Language</h3>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="input max-w-xs"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <h3 className="font-medium text-[var(--foreground)] mb-2">Timezone</h3>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="input max-w-xs"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <h3 className="font-medium text-[var(--foreground)] mb-2">Date Format</h3>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="input max-w-xs"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <button className="btn btn-primary">
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
