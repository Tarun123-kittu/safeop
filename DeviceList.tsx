import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Device } from "react-native-ble-plx";
import useSafeOpBLE, { DeviceStatus, KnownDevice } from "./useSafeOpBLE";
import { MaterialIcons } from "@expo/vector-icons";

const DeviceList: React.FC = () => {
  const {
    knownDevices,
    availableDevices,
    requestPermissions,
    scanForSafeOpDevices,
    connectToDevice,
    disconnectFromDevice,
  } = useSafeOpBLE();

  const [scanning, setScanning] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);

  const getStatusIcon = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.Connected:
        return <MaterialIcons name="bluetooth-connected" size={24} color="blue" />;
      case DeviceStatus.Disconnected:
        return <MaterialIcons name="bluetooth-disabled" size={24} color="red" />;
      case DeviceStatus.NeverConnected:
      default:
        return <MaterialIcons name="bluetooth" size={24} color="grey" />;
    }
  };

  const handleAddNewDevice = async () => {
    const granted = await requestPermissions();
    if (!granted) return;
    setScanning(true);
    scanForSafeOpDevices();
    setShowAvailable(true);
    setTimeout(() => setScanning(false), 8000);
  };

  const renderKnownDevice = ({ item }: { item: KnownDevice }) => (
    <View style={styles.deviceRow}>
      <View style={styles.deviceInfo}>
        {getStatusIcon(item.status)}
        <Text style={styles.deviceName}>{item.name}</Text>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() =>
          item.status === DeviceStatus.Connected
            ? disconnectFromDevice(item.id)
            : connectToDevice({ id: item.id, name: item.name } as Device)
        }
      >
        <Text style={styles.actionText}>
          {item.status === DeviceStatus.Connected ? "Disconnect" : "Connect"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAvailableDevice = ({ item }: { item: Device }) => (
    <View style={styles.deviceRow}>
      <View style={styles.deviceInfo}>
        <MaterialIcons name="bluetooth" size={24} color="green" />
        <Text style={styles.deviceName}>{item.name ?? "Unnamed Device"}</Text>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => connectToDevice(item)}
      >
        <Text style={styles.actionText}>Connect</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Known SafeOp Devices</Text>
      <FlatList
        data={knownDevices}
        keyExtractor={(item) => item.id}
        renderItem={renderKnownDevice}
        ListEmptyComponent={<Text>No known devices</Text>}
      />

      {!showAvailable ? (
        <TouchableOpacity style={styles.addButton} onPress={handleAddNewDevice}>
          <Text style={styles.addText}>Add New Device</Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text style={styles.title}>Available Devices</Text>
          {scanning && <ActivityIndicator size="small" color="#0000ff" />}
          <FlatList
            data={availableDevices}
            keyExtractor={(item) => item.id}
            renderItem={renderAvailableDevice}
            ListEmptyComponent={<Text>No available devices found</Text>}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    alignItems: "center",
  },
  deviceInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  deviceName: { fontSize: 16, marginLeft: 8 },
  actionButton: {
    backgroundColor: "#007bff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionText: { color: "white" },
  addButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: "green",
    borderRadius: 8,
    alignItems: "center",
  },
  addText: { color: "white", fontWeight: "bold" },
});

export default DeviceList;
