import React from 'react';
import TemporaryAccessGate from './components/TemporaryAccessGate';
import { DevGate } from './components/DevGate';

const AdminPageRoute = () => {
  return (
    <DevGate>
      <TemporaryAccessGate />
    </DevGate>
  );
};

export default AdminPageRoute;
