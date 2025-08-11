import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import * as ExpoDevice from "expo-device";

interface BluetoothLowEnergyApi {
  requestPermissions(): Promise<boolean>;
  scanForPeripherals(): void;
  connectToDevice: (device: Device) => Promise<void>;
  disconnectFromDevice: (deviceId: string) => void;
  connectedDevices: Device[];
  availableDevices: Device[];
}

function useBLE(): BluetoothLowEnergyApi {
  const bleManager = useMemo(() => new BleManager(), []);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);

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

  const isDuplicateDevice = (devices: Device[], nextDevice: Device) => {
    return devices.some((device) => device.id === nextDevice.id);
  };

  const scanForPeripherals = () => {
    setAvailableDevices([]); // Clear old devices before scanning
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error(error);
        return;
      }

      if (device && device.name) {
        setAvailableDevices((prevDevices) => {
          if (!isDuplicateDevice(prevDevices, device)) {
            return [...prevDevices, device];
          }
          return prevDevices;
        });
      }
    });

    // Stop scanning after 10 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
    }, 10000);
  };

  const connectToDevice = async (device: Device) => {
    try {
      const connected = await bleManager.connectToDevice(device.id);
      setConnectedDevices((prev) => [...prev, connected]);
      setAvailableDevices((prev) => prev.filter((d) => d.id !== device.id));
    } catch (e) {
      console.error("Failed to connect:", e);
    }
  };

  const disconnectFromDevice = async (deviceId: string) => {
    try {
      await bleManager.cancelDeviceConnection(deviceId);
      setConnectedDevices((prev) => prev.filter((d) => d.id !== deviceId));
    } catch (e) {
      console.error("Failed to disconnect:", e);
    }
  };

  return {
    scanForPeripherals,
    requestPermissions,
    connectToDevice,
    disconnectFromDevice,
    connectedDevices,
    availableDevices,
  };
}

export default useBLE;
