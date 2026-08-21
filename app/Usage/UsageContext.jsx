
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';
import { getToken, getUser } from '../utils/authStorage';
import { summarizeUsageBill } from '../utils/billing';

const UsageContext = createContext();
const DEFAULT_TIMEZONE = 'Asia/Rangoon';
const MONTHLY_BUDGET_KEY_PREFIX = 'easyeco_monthly_budget';

async function getMonthlyBudgetStorageKey() {
  const user = await getUser();
  const userId = user?._id || user?.id;

  return userId ? `${MONTHLY_BUDGET_KEY_PREFIX}:${userId}` : null;
}

function getRangoonDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value])
  );
}

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
  const { year, month } = getRangoonDateParts();
  return `${year}-${month}`;
}

function currentDate() {
  const { year, month, day } = getRangoonDateParts();
  return `${year}-${month}-${day}`;
}

function calculateConfiguredMonthlyCost(devices = []) {
  const devicesByCategory = devices.reduce((groups, device) => ({
    ...groups,
    [device.categoryId]: [...(groups[device.categoryId] || []), device],
  }), {});

  return summarizeUsageBill((category) => devicesByCategory[category] || []).totalMonthlyCost;
}

export function UsageProvider({ children }) {
  const [monthlyBudget, setMonthlyBudgetState] = useState(100);
  const [devices, setDevices] = useState([]);
  const [monthlyEstimate, setMonthlyEstimate] = useState(null);
  const [hasCalculatedBill, setHasCalculatedBill] = useState(false);
  const [latestConfiguration, setLatestConfiguration] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSavedBudget = async () => {
      try {
        const key = await getMonthlyBudgetStorageKey();
        const value = key ? await AsyncStorage.getItem(key) : null;

        if (isActive && value) {
          setMonthlyBudgetState(JSON.parse(value));
        }
      } catch {
      }
    };

    loadSavedBudget();

    return () => {
      isActive = false;
    };
  }, []);

  const setMonthlyBudget = useCallback((value) => {
    setMonthlyBudgetState(value);
    getMonthlyBudgetStorageKey()
      .then((key) => key && AsyncStorage.setItem(key, JSON.stringify(value)))
      .catch(() => undefined);
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
    setIsLoading(true);
    try {
      const config = await getAuthConfig();
      const response = await axios.get(`${API_BASE_URL}/usage-snapshots/estimate`, {
        ...config,
        params: { month, timezone: DEFAULT_TIMEZONE },
      });
      setMonthlyEstimate(response.data);
      const savedBudget = Number(response.data.monthlyBudget) || 0;
      setMonthlyBudgetState(savedBudget);
      const budgetKey = await getMonthlyBudgetStorageKey();
      if (budgetKey) {
        await AsyncStorage.setItem(budgetKey, JSON.stringify(savedBudget));
      }
      setLatestConfiguration(response.data.latestConfiguration || []);
      const latestAppliances = Array.isArray(response.data.latestConfiguration)
        ? response.data.latestConfiguration
        : [];
      const restoredDevices = latestAppliances.map(snapshotApplianceToDevice);
      setDevices(restoredDevices);
      setHasCalculatedBill(restoredDevices.length > 0);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthConfig]);

  const fetchRecommendations = useCallback(async (month = currentMonth()) => {
    setIsLoading(true);
    try {
      const config = await getAuthConfig();
      const response = await axios.get(`${API_BASE_URL}/usage-snapshots/recommendations`, {
        ...config,
        params: { month },
      });
      setRecommendations(response.data);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthConfig]);

  const saveMonthlyBudget = useCallback(async (value) => {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Monthly budget must be a non-negative number.');
    }

    const config = await getAuthConfig();
    const response = await axios.post(
      `${API_BASE_URL}/users/budget`,
      { monthlyBudget: value },
      config
    );
    const savedBudget = Number(response.data.monthlyBudget) || 0;

    setMonthlyBudgetState(savedBudget);
    const budgetKey = await getMonthlyBudgetStorageKey();
    if (budgetKey) {
      await AsyncStorage.setItem(budgetKey, JSON.stringify(savedBudget));
    }
    await fetchMonthlyEstimate();

    return savedBudget;
  }, [fetchMonthlyEstimate, getAuthConfig]);

  const refreshUsage = useCallback(async () => {
    setIsReady(false);
    try {
      await fetchMonthlyEstimate();
    } catch (error) {
      if (error.response?.status === 401) {
        setDevices([]);
        setMonthlyEstimate(null);
      }
      throw error;
    } finally {
      setIsReady(true);
    }
  }, [fetchMonthlyEstimate]);

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
          'Idempotency-Key': `snapshot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      setDevices(nextDevices);
      return await fetchMonthlyEstimate();
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

  const getForecast = useCallback((estimate = monthlyEstimate, configuredDevices = devices) => {
    const today = currentDate();
    const todayEntry = estimate?.timeline?.find((entry) => entry.date === today);
    const currentUsageUnits =
      estimate?.currentUsageUnits ?? todayEntry?.dailyUnits ?? 0;
    const currentBill = estimate?.currentBill ?? 0;
    const estimatedUnits =
      estimate?.projectedUnits ?? estimate?.totalUnits ?? 0;
    const estimatedCost = calculateConfiguredMonthlyCost(configuredDevices);
    const isOverBudget = estimatedCost > monthlyBudget;
    return {
      currentDailyUnits: currentUsageUnits,
      currentDailyCost: currentBill,
      estimatedUnits,
      estimatedCost,
      isOverBudget,
      overBudgetAmount: isOverBudget ? estimatedCost - monthlyBudget : 0,
      timeline: estimate?.timeline || [],
      estimatedPeriod: estimate?.estimatedPeriod || null,
    };
  }, [devices, monthlyBudget, monthlyEstimate]);

  const clearAllUsage = useCallback(() => {
    // Used on logout: it clears only device-local state, never historical data.
    setDevices([]);
    setMonthlyEstimate(null);
    setHasCalculatedBill(false);
    setLatestConfiguration([]);
    setRecommendations(null);
    setMonthlyBudgetState(0);
  }, []);

  return (
    <UsageContext.Provider value={{
      usageData,
      devices,
      monthlyBudget,
      monthlyEstimate,
      hasCalculatedBill,
      latestConfiguration,
      recommendations,
      isReady,
      isSaving,
      isLoading,
      addUsage,
      removeUsage,
      getUsage,
      fetchUsage: refreshUsage,
      fetchMonthlyEstimate,
      fetchRecommendations,
      refreshUsage,
      clearAllUsage,
      getAllDevices,
      getDeviceById,
      addDevice,
      updateDevice,
      deleteDevice,
      saveConfiguration,
      markBillCalculated: () => setHasCalculatedBill(true),
      setMonthlyBudget,
      saveMonthlyBudget,
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
