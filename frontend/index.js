import LocalAuthSetupStep from './LocalAuthSetupStep.jsx';
import LocalAuthSettings from './LocalAuthSettings.jsx';

export default {
  id: 'local-auth',

  setupWizardSteps: [
    {
      id: 'local-auth-setup',
      slot: 'auth',
      title: 'Local Auth',
      description: 'Configure a single username and password for this instance',
      component: LocalAuthSetupStep,
      order: 0,
    },
  ],

  settingsSections: [
    {
      id: 'local-auth-settings',
      label: 'Local Auth',
      tab: 'extensions',
      tabLabel: 'Extensions',
      tabOrder: 99,
      slot: 'auth',
      providerId: 'local',
      component: LocalAuthSettings,
      order: 0,
    },
  ],
};
