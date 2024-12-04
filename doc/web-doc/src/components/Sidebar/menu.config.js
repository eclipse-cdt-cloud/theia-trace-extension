export const sideMenu = [
  {
    label: 'Home',
    to: '/',
  },
  {
    label: 'Profile',
    to: '/profile',
  },
  {
    label: 'Settings',
    to: '/settings',
    children: [
      {
        label: 'Account',
        to: 'account',
      },
      {
        label: 'Security',
        to: 'security',
        children: [
          {
            label: 'Credentials',
            to: 'credentials',
          },
          {
            label: '2-FA',
            to: '2fa',
          },
        ],
      },
    ],
  },
];
