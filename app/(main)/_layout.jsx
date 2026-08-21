import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { TabBar } from '../../components/TabBar'; 
import { useUsage } from '../Usage/UsageContext';


export default function TabLayout() {
  const { refreshUsage } = useUsage();

  useEffect(() => {
    // The provider may have loaded before authentication completed. Refresh
    // when the signed-in tab layout opens so saved device data is restored.
    refreshUsage().catch(() => undefined);
  }, [refreshUsage]);

  return (
    
      <Tabs
      
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false, 
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="robot" />
      <Tabs.Screen name="finance" />
      <Tabs.Screen name="profile" />
    </Tabs>
    
  );
}
