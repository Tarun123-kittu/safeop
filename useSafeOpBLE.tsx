import { useEffect, useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import * as ExpoDevice from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

interface UniversalBLEApi {
    knownDevices: KnownDevice[];
    availableDevices: Device[];
    requestPermissions(): Promise<boolean>;
    scanForDevices(): void;
    connectToDevice(device: Device): Promise<void>;
    disconnectFromDevice(deviceId: string): Promise<void>;
}

function useUniversalBLE(): UniversalBLEApi {
    const bleManager = useMemo(() => new BleManager(), []);
    const [knownDevices, setKnownDevices] = useState<KnownDevice[]>([]);
    const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
    const [connections, setConnections] = useState<Record<string, Device>>({});

    /** Load saved devices on mount */
    useEffect(() => {
        loadKnownDevices();
    }, []);

    const loadKnownDevices = async () => {
        try {
            const saved = await AsyncStorage.getItem("knownDevices");
            if (saved) setKnownDevices(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to load known devices", e);
        }
    };

    const saveKnownDevices = async (devices: KnownDevice[]) => {
        setKnownDevices(devices);
        await AsyncStorage.setItem("knownDevices", JSON.stringify(devices));
    };

    /** Handle permissions */
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

    /** Prevent duplicates */
    const isDuplicate = (devices: Device[], next: Device) =>
        devices.some((d) => d.id === next.id);

    /** Scan for all nearby devices */
    const scanForDevices = () => {
        setAvailableDevices([]);
        bleManager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.error("Scan error:", error);
                return;
            }
            if (device && device.name) {
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

    /** Connect to device */
    const connectToDevice = async (device: Device) => {

        console.log(device, "device");

        try {
            const connected = await bleManager.connectToDevice(device.id);

                    console.log(connected, "connected");

            await connected.discoverAllServicesAndCharacteristics();

            setConnections((prev) => ({ ...prev, [device.id]: connected }));

            const existing = knownDevices.find((d) => d.id === device.id);
            if (existing) {
                existing.status = DeviceStatus.Connected;
                await saveKnownDevices([...knownDevices]);
            } else {
                await saveKnownDevices([
                    ...knownDevices,
                    {
                        id: device.id,
                        name: device.name ?? "Unnamed",
                        status: DeviceStatus.Connected,
                    },
                ]);
            }
        } catch (e) {
            console.error("Connect error:", e);
        }
    };

    /** Disconnect from device */
    const disconnectFromDevice = async (deviceId: string) => {
        try {
            const connected = await bleManager.isDeviceConnected(deviceId);

            if (!connected) {
                console.warn(`⚠ Device ${deviceId} is already disconnected, but will remove from known list`);
            } else {
                await bleManager.cancelDeviceConnection(deviceId);
                console.log(`🔌 Disconnected from ${deviceId}`);
            }

            // Remove from active connections
            setConnections((prev) => {
                const copy = { ...prev };
                delete copy[deviceId];
                return copy;
            });

            // Update stored status
            const updated = knownDevices.map((d) =>
                d.id === deviceId ? { ...d, status: DeviceStatus.Disconnected } : d
            );
            await saveKnownDevices(updated);

        } catch (e: any) {
            // If error is "is not connected" — ignore it
            if (e?.message?.includes("not connected")) {
                console.warn(`⚠ Tried to disconnect ${deviceId} but it was already disconnected`);
            } else {
                console.error("Disconnect error:", e);
            }
        }
    };

    console.log(availableDevices, "availableDevices");

    return {
        knownDevices,
        availableDevices,
        requestPermissions,
        scanForDevices,
        connectToDevice,
        disconnectFromDevice,
    };
}

export default useUniversalBLE;
