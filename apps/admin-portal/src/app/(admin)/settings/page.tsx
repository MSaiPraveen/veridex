'use client';

import { useState } from 'react';
import { 
  Settings, 
  Shield, 
  Bell, 
  Key, 
  Globe,
  Save,
  RefreshCw,
  Lock,
  AlertTriangle,
  Clock,
  Users,
  Database
} from 'lucide-react';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

type SettingsTab = 'security' | 'notifications' | 'api' | 'system';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');
  const [isSaving, setIsSaving] = useState(false);
  
  const permissions = useAdminPermissions();
  
  const tabs = [
    { id: 'security' as const, label: 'Security', icon: Shield, permission: AdminPermission.SETTINGS_SECURITY },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell, permission: null },
    { id: 'api' as const, label: 'API Keys', icon: Key, permission: AdminPermission.SETTINGS_API_KEYS },
    { id: 'system' as const, label: 'System', icon: Database, permission: AdminPermission.SYSTEM_CONFIG },
  ];
  
  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };
  
  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage admin portal configuration
          </p>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex gap-4">
            {tabs.map((tab) => {
              // Check permission if required
              if (tab.permission && !permissions.hasPermission(tab.permission)) {
                return null;
              }
              
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    isActive
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="admin-card">
          {activeTab === 'security' && (
            <PermissionGate permission={AdminPermission.SETTINGS_SECURITY} fallback={
              <div className="p-8 text-center">
                <Lock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                  Access Denied
                </h3>
                <p className="text-slate-500 mt-1">
                  You don't have permission to view security settings
                </p>
              </div>
            }>
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  Security Settings
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        Require MFA for all admins
                      </p>
                      <p className="text-sm text-slate-500">
                        Force all admin users to set up two-factor authentication
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        Session timeout
                      </p>
                      <p className="text-sm text-slate-500">
                        Automatically log out inactive admin sessions
                      </p>
                    </div>
                    <select className="admin-input w-auto" defaultValue="30">
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        Failed login lockout
                      </p>
                      <p className="text-sm text-slate-500">
                        Lock account after failed login attempts
                      </p>
                    </div>
                    <select className="admin-input w-auto" defaultValue="5">
                      <option value="3">3 attempts</option>
                      <option value="5">5 attempts</option>
                      <option value="10">10 attempts</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        IP Whitelist
                      </p>
                      <p className="text-sm text-slate-500">
                        Restrict admin access to specific IP addresses
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            </PermissionGate>
          )}
          
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                Notification Preferences
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Security alerts
                    </p>
                    <p className="text-sm text-slate-500">
                      Get notified about suspicious login attempts
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Compliance queue updates
                    </p>
                    <p className="text-sm text-slate-500">
                      Notify when new items need review
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Critical failures
                    </p>
                    <p className="text-sm text-slate-500">
                      Immediate notification for critical compliance failures
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'api' && (
            <PermissionGate permission={AdminPermission.SETTINGS_API_KEYS} fallback={
              <div className="p-8 text-center">
                <Lock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                  Access Denied
                </h3>
                <p className="text-slate-500 mt-1">
                  You don't have permission to manage API keys
                </p>
              </div>
            }>
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-500" />
                  API Keys
                </h3>
                
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Security Warning
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        API keys provide full access to the admin API. Keep them secure and rotate regularly.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        Production API Key
                      </p>
                      <p className="text-sm text-slate-500">
                        Created Dec 15, 2025 • Last used 2 hours ago
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm">
                        vdx_prod_****4f8a
                      </code>
                      <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        Development API Key
                      </p>
                      <p className="text-sm text-slate-500">
                        Created Dec 20, 2025 • Last used 5 days ago
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm">
                        vdx_dev_****9c2b
                      </code>
                      <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <button className="admin-button-primary">
                  <Key className="h-4 w-4" />
                  Generate New API Key
                </button>
              </div>
            </PermissionGate>
          )}
          
          {activeTab === 'system' && (
            <PermissionGate permission={AdminPermission.SYSTEM_CONFIG} fallback={
              <div className="p-8 text-center">
                <Lock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                  Access Denied
                </h3>
                <p className="text-slate-500 mt-1">
                  You don't have permission to modify system configuration
                </p>
              </div>
            }>
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-amber-500" />
                  System Configuration
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-500">API Gateway</p>
                    <p className="text-lg font-medium text-emerald-600">Healthy</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-500">Database</p>
                    <p className="text-lg font-medium text-emerald-600">Connected</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-500">Kafka</p>
                    <p className="text-lg font-medium text-emerald-600">Active</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-500">Redis</p>
                    <p className="text-lg font-medium text-emerald-600">Connected</p>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-medium text-slate-900 dark:text-white">
                      Maintenance Mode
                    </p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                  <p className="text-sm text-slate-500">
                    Enable maintenance mode to temporarily disable public access
                  </p>
                </div>
              </div>
            </PermissionGate>
          )}
        </div>
        
        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="admin-button-primary"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
    </div>
  );
}
