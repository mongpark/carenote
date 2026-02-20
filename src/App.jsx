import { useState, useEffect } from 'react';
import HomeScreen from './screens/HomeScreen';
import CareWorkerScreen from './screens/CareWorkerScreen';
import CaregiverScreen from './screens/CaregiverScreen';
import CertificateScreen from './screens/CertificateScreen';
import { getOrCreateUserId } from './utils/user';

function App() {
  const [screen, setScreen] = useState('home');

  useEffect(() => {
    try {
      getOrCreateUserId();
    } catch (_) {}
  }, []);

  const handleSelectRole = (role) => {
    if (role === 'caregiver') setScreen('caregiver');
    else setScreen('careWorker');
  };

  return (
    <div className="min-h-screen max-w-md mx-auto">
      {screen === 'home' && (
        <HomeScreen onSelectRole={handleSelectRole} />
      )}
      {screen === 'careWorker' && (
        <CareWorkerScreen
          onBack={() => setScreen('home')}
          onGoToCertificate={() => setScreen('certificate')}
        />
      )}
      {screen === 'caregiver' && (
        <CaregiverScreen onBack={() => setScreen('home')} />
      )}
      {screen === 'certificate' && (
        <CertificateScreen onBack={() => setScreen('careWorker')} />
      )}
    </div>
  );
}

export default App;
