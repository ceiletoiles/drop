import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';

export const AndroidBackButtonHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    let active = true;

    const subscriptionPromise = App.addListener('backButton', async () => {
      if (!active) return;

      if (window.history.length > 1) {
        navigate(-1);
        return;
      }

      await App.exitApp();
    });

    return () => {
      active = false;
      void subscriptionPromise.then((subscription) => subscription.remove());
    };
  }, [navigate]);

  return null;
};
