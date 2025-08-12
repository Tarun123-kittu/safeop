import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import useBLE from "./useBLE";
import DeviceModal from "./DeviceConnectionModal";
import DeviceList from "./DeviceList";
import { SafeAreaView } from "react-native-safe-area-context";

const App = () => {
  const {
    requestPermissions,
    scanForPeripherals,
    connectToDevice,
    disconnectFromDevice,
    connectedDevices,
    availableDevices,
  } = useBLE();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const openModal = async () => {
    await requestPermissions();
    setIsModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* <TouchableOpacity style={styles.button} onPress={openModal}>
        <Text style={styles.buttonText}>Manage Devices</Text>
      </TouchableOpacity>

      <DeviceModal
        visible={isModalVisible}
        closeModal={() => setIsModalVisible(false)}
        connectedDevices={connectedDevices}
        availableDevices={availableDevices}
        onAddNewDevice={scanForPeripherals}
        onConnect={connectToDevice}
        onDisconnect={(device) => disconnectFromDevice(device.id)}
      /> */}
      <DeviceList />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  button: { padding: 15, backgroundColor: "#FF6060", borderRadius: 8 },
  buttonText: { color: "white", fontWeight: "bold" },
});

export default App;
