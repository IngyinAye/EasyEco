
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';
import { getToken, getUser } from '../utils/authStorage';

const UsageContext = createContext();
const DEFAULT_TIMEZONE = 'Asia/Rangoon';

const createId = () => `appliance-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const parseWatt = (value) => Number(String(value ?? '').match(/[\d.]+/)?.[0] || 0);
const parseMinutes = (value) => {
  const text = String(value ?? '');
  const hours = Number(text.match(/(\d+)\s*hr/i)?.[1] || 0);
  const minutes = Number(text.match(/(\d+)\s*min/i)?.[1] || 0);
  return hours * 60 + minutes;
};
const formatTime = (minutes) => `${Math.floor(minutes / 60)} hr ${String(minutes % 60).padStart(2, '0')} min`;

function snapshotApplianceToDevice(appliance) {
  return {
    id: appliance.applianceId,
    categoryId: appliance.category,
    name: appliance.name,
    watt: `${appliance.watt} Watt`,
    time: formatTime(appliance.minutesPerDay),
    quantity: appliance.quantity,
    dutyCyclePercent: appliance.dutyCyclePercent,
  };
}

function deviceToSnapshotAppliance(device, index) {
  return {
    applianceId: device.id || device.applianceId || `appliance-${index + 1}`,
    category: device.categoryId || device.category,
    name: device.name,
    watt: parseWatt(device.watt),
    quantity: Number(device.quantity) || 1,
    minutesPerDay: Number.isFinite(Number(device.minutesPerDay))
      ? Number(device.minutesPerDay)
      : parseMinutes(device.time),
    dutyCyclePercent: Number(device.dutyCyclePercent ?? 100),
  };
}

function usageToDevice(usage) {
  return {
    id: usage._id || usage.id,
    categoryId: usage.category,
    name: usage.name,
    watt: usage.watt,
    time: usage.time,
  };
}

function currentMonth() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).format(new Date()).replace('/', '-');
}

export function UsageProvider({ children }) {
  const [monthlyBudget, setMonthlyBudgetState] = useState(100);
  const [devices, setDevices] = useState([]);
  const [monthlyEstimate, setMonthlyEstimate] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('monthlyBudget')
      .then((value) => value && setMonthlyBudgetState(JSON.parse(value)))
      .catch(() => undefined);
  }, []);

  const setMonthlyBudget = useCallback((value) => {
    setMonthlyBudgetState(value);
    AsyncStorage.setItem('monthlyBudget', JSON.stringify(value)).catch(() => undefined);
  }, []);

  const getAuthConfig = useCallback(async () => {
    const [token, user] = await Promise.all([getToken(), getUser()]);
    return {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(user?._id ? { 'X-User-Id': String(user._id) } : {}),
      },
    };
  }, []);

  const fetchUsage = useCallback(async () => {
    const config = await getAuthConfig();
    const response = await axios.get(`${API_BASE_URL}/usage`, config);
    const nextDevices = Array.isArray(response.data)
      ? response.data.map(usageToDevice)
      : [];
    setDevices(nextDevices);
    return nextDevices;
  }, [getAuthConfig]);

  const fetchMonthlyEstimate = useCallback(async (month = currentMonth()) => {
    const config = await getAuthConfig();
    const response = await axios.get(`${API_BASE_URL}/usage-snapshots/estimate`, {
      ...config,
      params: { month, timezone: DEFAULT_TIMEZONE },
    });
    setMonthlyEstimate(response.data);
    return response.data;
  }, [getAuthConfig]);

  const refreshUsage = useCallback(async () => {
    try {
      await Promise.all([fetchUsage(), fetchMonthlyEstimate()]);
    } catch (error) {
      if (error.response?.status === 401) {
        setDevices([]);
        setMonthlyEstimate(null);
      }
      throw error;
    } finally {
      setIsReady(true);
    }
  }, [fetchMonthlyEstimate, fetchUsage]);

  useEffect(() => {
    refreshUsage().catch(() => undefined);
  }, [refreshUsage]);

  const saveConfiguration = useCallback(async (nextDevices) => {
    setIsSaving(true);
    try {
      const config = await getAuthConfig();
      await axios.post(`${API_BASE_URL}/usage-snapshots`, {
        timezone: DEFAULT_TIMEZONE,
        appliances: nextDevices.map(deviceToSnapshotAppliance),
      }, {
        ...config,
        headers: {
          ...config.headers,
          // Prevent a network retry from creating a second history record.
          'Idempotency-Key': `snapshot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      setDevices(nextDevices);
      await fetchMonthlyEstimate();
    } finally {
      setIsSaving(false);
    }
  }, [fetchMonthlyEstimate, getAuthConfig]);

  const addUsage = useCallback(async (category, item) => {
    const localId = item.id || createId();
    const nextItem = { ...item, id: localId, categoryId: category };
    setDevices((previous) => [...previous, nextItem]);

    try {
      const config = await getAuthConfig();
      const response = await axios.post(`${API_BASE_URL}/usage`, {
        category,
        name: item.name,
        watt: item.watt,
        time: item.time,
      }, config);
      const savedItem = usageToDevice(response.data);
      setDevices((previous) => previous.map((device) => (
        device.id === localId ? savedItem : device
      )));
    } catch (error) {
      setDevices((previous) => previous.filter((device) => device.id !== localId));
      throw error;
    }
  }, [getAuthConfig]);

  const removeUsage = useCallback(async (_category, itemId) => {
    const removedItem = devices.find((device) => device.id === itemId);
    setDevices((previous) => previous.filter((device) => device.id !== itemId));

    try {
      const config = await getAuthConfig();
      await axios.delete(`${API_BASE_URL}/usage/${itemId}`, config);
    } catch (error) {
      if (removedItem) {
        setDevices((previous) => [...previous, removedItem]);
      }
      throw error;
    }
  }, [devices, getAuthConfig]);

  const addDevice = useCallback(async (device) => {
    const next = [...devices, { ...device, id: device.id || createId() }];
    await saveConfiguration(next);
  }, [devices, saveConfiguration]);

  const updateDevice = useCallback(async (id, updates) => {
    const next = devices.map((device) => device.id === id ? { ...device, ...updates, id } : device);
    await saveConfiguration(next);
  }, [devices, saveConfiguration]);

  const deleteDevice = useCallback(async (id) => {
    await saveConfiguration(devices.filter((device) => device.id !== id));
  }, [devices, saveConfiguration]);

  const usageData = useMemo(() => devices.reduce((groups, device) => ({
    ...groups,
    [device.categoryId]: [...(groups[device.categoryId] || []), device],
  }), {}), [devices]);

  const getUsage = useCallback((category) => usageData[category] || [], [usageData]);
  const getAllDevices = useCallback(() => devices, [devices]);
  const getDeviceById = useCallback((id) => devices.find((device) => device.id === id), [devices]);

  const getForecast = useCallback(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TIMEZONE }).format(new Date());
    const todayEntry = monthlyEstimate?.timeline?.find((entry) => entry.date === today);
    const estimatedUnits = monthlyEstimate?.totalUnits || 0;
    const estimatedCost = monthlyEstimate?.totalBill || 0;
    const isOverBudget = estimatedCost > monthlyBudget;
    return {
      currentDailyUnits: todayEntry?.dailyUnits || 0,
      currentDailyCost: 0,
      estimatedUnits,
      estimatedCost,
      isOverBudget,
      overBudgetAmount: isOverBudget ? estimatedCost - monthlyBudget : 0,
      timeline: monthlyEstimate?.timeline || [],
      estimatedPeriod: monthlyEstimate?.estimatedPeriod || null,
    };
  }, [monthlyBudget, monthlyEstimate]);

  const clearAllUsage = useCallback(() => {
    // Used on logout: it clears only device-local state, never historical data.
    setDevices([]);
    setMonthlyEstimate(null);
  }, []);

  return (
    <UsageContext.Provider value={{
      usageData,
      devices,
      monthlyBudget,
      monthlyEstimate,
      isReady,
      isSaving,
      addUsage,
      removeUsage,
      getUsage,
      fetchUsage: refreshUsage,
      fetchMonthlyEstimate,
      refreshUsage,
      clearAllUsage,
      getAllDevices,
      getDeviceById,
      addDevice,
      updateDevice,
      deleteDevice,
      saveConfiguration,
      setMonthlyBudget,
      getForecast,
      // Kept temporarily so existing presentation components do not crash.
      dailyRecords: [],
      firstEntryDate: monthlyEstimate?.estimatedPeriod?.startDate || null,
      saveDailyRecord: () => undefined,
      getDailyUsage: (date) => monthlyEstimate?.timeline?.find((item) => item.date === date)?.dailyUnits || 0,
    }}>
      {children}
    </UsageContext.Provider>
  );
}

export const useUsage = () => useContext(UsageContext);
