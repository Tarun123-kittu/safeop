import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { Device } from "react-native-ble-plx";

interface Props {
  visible: boolean;
  closeModal: () => void;
  connectedDevices: Device[];
  availableDevices: Device[];
  onAddNewDevice: () => void;
  onConnect: (device: Device) => void;
  onDisconnect: (device: Device) => void;
}

const DeviceModal: React.FC<Props> = ({
  visible,
  closeModal,
  connectedDevices,
  availableDevices,
  onAddNewDevice,
  onConnect,
  onDisconnect,
}) => {
  const [showAvailable, setShowAvailable] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={closeModal}>
      <View style={styles.container}>
        <Text style={styles.title}>Connected Devices</Text>
        <FlatList
          data={connectedDevices}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text>No connected devices</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.deviceItem}
              onPress={() => onDisconnect(item)}
            >
              <Text>{item.name || "Unnamed Device"}</Text>
              <Text style={styles.disconnect}>Disconnect</Text>
            </TouchableOpacity>
          )}
        />

        {!showAvailable ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              onAddNewDevice();
              setShowAvailable(true);
            }}
          >
            <Text style={styles.addButtonText}>Add New Device</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.title}>Available Devices</Text>
            <FlatList
              data={
                availableDevices.filter(
                  (dev) =>
                    !connectedDevices.some((conn) => conn.id === dev.id)
                ) // Remove already connected ones
              }
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text>No available devices</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.deviceItem}
                  onPress={() => onConnect(item)}
                >
                  <Text>{item.name || "Unnamed Device"}</Text>
                  <Text style={styles.connect}>Connect</Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  deviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
  },
  disconnect: { color: "red" },
  connect: { color: "green" },
  addButton: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: "#007bff",
    borderRadius: 8,
  },
  addButtonText: { color: "white", textAlign: "center" },
  closeButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#ccc",
    borderRadius: 8,
  },
  closeText: { textAlign: "center" },
});

export default DeviceModal;
