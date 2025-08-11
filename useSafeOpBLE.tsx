import { useEffect, useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import * as ExpoDevice from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Adjust this to the SafeOp name prefix or advertised service UUID
const SAFEOP_NAME_PREFIX = "SafeOp";

// Placeholder UUIDs — replace with actual from SafeOp
const RELAY_SERVICE_UUID = "0000xxxx-0000-1000-8000-00805f9b34fb";
const RELAY_CHARACTERISTIC_UUID = "0000yyyy-0000-1000-8000-00805f9b34fb";
const INPUT_STATE_CHARACTERISTIC_UUID = "0000zzzz-0000-1000-8000-00805f9b34fb";

export enum DeviceStatus {
  NeverConnected = "never_connected",
  Connected = "connected",
  Disconnected = "disconnected",
}

export interface KnownDevice {
  id: string;
  name: string;
  status: DeviceStatus;
}

interface SafeOpBLEApi {
  knownDevices: KnownDevice[];
  availableDevices: Device[];
  requestPermissions(): Promise<boolean>;
  scanForSafeOpDevices(): void;
  connectToDevice(device: Device): Promise<void>;
  disconnectFromDevice(deviceId: string): Promise<void>;
  toggleRelay(deviceId: string, relayIndex: number, state: boolean): Promise<void>;
}

function useSafeOpBLE(): SafeOpBLEApi {
  const bleManager = useMemo(() => new BleManager(), []);
  const [knownDevices, setKnownDevices] = useState<KnownDevice[]>([]);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [connections, setConnections] = useState<Record<string, Device>>({});

  // Load saved devices from storage on mount
  useEffect(() => {
    loadKnownDevices();
  }, []);

  const loadKnownDevices = async () => {
    try {
      const saved = await AsyncStorage.getItem("knownDevices");
      if (saved) {
        setKnownDevices(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load known devices", e);
    }
  };

  const saveKnownDevices = async (devices: KnownDevice[]) => {
    setKnownDevices(devices);
    await AsyncStorage.setItem("knownDevices", JSON.stringify(devices));
  };

  const checkAndRequestPermission = async (permission: any, title: string) => {
    const alreadyGranted = await PermissionsAndroid.check(permission);
    if (alreadyGranted) return true;
    const result = await PermissionsAndroid.request(permission, {
      title,
      message: "Bluetooth Low Energy requires this permission",
      buttonPositive: "OK",
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      const apiLevel = ExpoDevice.platformApiLevel ?? -1;
      if (apiLevel < 31) {
        return await checkAndRequestPermission(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          "Location Permission"
        );
      } else {
        const scanGranted = await checkAndRequestPermission(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          "Bluetooth Scan Permission"
        );
        const connectGranted = await checkAndRequestPermission(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          "Bluetooth Connect Permission"
        );
        const locationGranted = await checkAndRequestPermission(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          "Location Permission"
        );
        return scanGranted && connectGranted && locationGranted;
      }
    }
    return true;
  };

  const isDuplicate = (devices: Device[], next: Device) =>
    devices.some((d) => d.id === next.id);

  const scanForSafeOpDevices = () => {
    setAvailableDevices([]);
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Scan error:", error);
        return;
      }
            if (device && device.name) {

    //   if (device?.name?.startsWith(SAFEOP_NAME_PREFIX)) {
        setAvailableDevices((prev) => {
          if (!isDuplicate(prev, device)) {
            return [...prev, device];
          }
          return prev;
        });
      }
    });

    setTimeout(() => bleManager.stopDeviceScan(), 8000);
  };

  console.log(availableDevices,"availableDevices");

  const connectToDevice = async (device: Device) => {
    try {
      const connected = await bleManager.connectToDevice(device.id);
      await connected.discoverAllServicesAndCharacteristics();

      setConnections((prev) => ({ ...prev, [device.id]: connected }));

      // Update known devices list
      const existing = knownDevices.find((d) => d.id === device.id);
      if (existing) {
        existing.status = DeviceStatus.Connected;
        await saveKnownDevices([...knownDevices]);
      } else {
        await saveKnownDevices([
          ...knownDevices,
          { id: device.id, name: device.name ?? "Unnamed", status: DeviceStatus.Connected },
        ]);
      }

      // Optionally: subscribe to input state changes here
      connected.monitorCharacteristicForService(
        RELAY_SERVICE_UUID,
        INPUT_STATE_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error("Input state error:", error);
            return;
          }
          console.log("Input state updated:", characteristic?.value);
        }
      );
    } catch (e) {
      console.error("Connect error:", e);
    }
  };

  const disconnectFromDevice = async (deviceId: string) => {
    try {
      await bleManager.cancelDeviceConnection(deviceId);
      setConnections((prev) => {
        const copy = { ...prev };
        delete copy[deviceId];
        return copy;
      });
      const updated = knownDevices.map((d) =>
        d.id === deviceId ? { ...d, status: DeviceStatus.Disconnected } : d
      );
      await saveKnownDevices(updated);
    } catch (e) {
      console.error("Disconnect error:", e);
    }
  };

  const toggleRelay = async (deviceId: string, relayIndex: number, state: boolean) => {
    try {
      const device = connections[deviceId];
      if (!device) throw new Error("Device not connected");

      // Encode your relay command here (depends on SafeOp protocol)
      const command = state ? "AQ==" : "AA=="; // Example: base64 of [1] or [0]
      await device.writeCharacteristicWithResponseForService(
        RELAY_SERVICE_UUID,
        RELAY_CHARACTERISTIC_UUID,
        command
      );
    } catch (e) {
      console.error("Relay toggle error:", e);
    }
  };

  return {
    knownDevices,
    availableDevices,
    requestPermissions,
    scanForSafeOpDevices,
    connectToDevice,
    disconnectFromDevice,
    toggleRelay,
  };
}

export default useSafeOpBLE;
