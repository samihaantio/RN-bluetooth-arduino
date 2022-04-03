import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  View,
  ActivityIndicator,
} from 'react-native';
import BluetoothSerial from 'react-native-bluetooth-serial';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

const Button = ({ title, onPress, style, textStyle }) =>
  <TouchableOpacity style={[ styles.button, style ]} onPress={onPress}>
    <Text style={[ styles.buttonText, textStyle ]}>{title.toUpperCase()}</Text>
  </TouchableOpacity>

const DeviceList = ({ devices, connectedId, showConnectedIcon, onDevicePress }) =>
  <View style={styles.listContainer}>
    {devices.map((device, i) => {
      return (
        <TouchableHighlight
          underlayColor='#DDDDDD'
          key={`${device.id}_${i}`}
          style={styles.listItem} onPress={() => onDevicePress(device)}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold' }}>{device.name}</Text>
              <Text>{`<${device.id}>`}</Text>
            </View>
          </View>
        </TouchableHighlight>
      )
    })}
  </View>

export default class App extends Component {
  constructor (props) {
    super(props)
    this.state = {
      isEnabled: false,
      discovering: false,
      devices: [],
      unpairedDevices: [],
      connected: false,
      section: 0
    }
  }

  componentWillMount () {
    Promise.all([
      BluetoothSerial.isEnabled(),
      BluetoothSerial.list()
    ])
    .then((values) => {
      const [ isEnabled, devices ] = values
      this.setState({ isEnabled, devices })
    })

    BluetoothSerial.on('bluetoothEnabled', () => console.log('Bluetooth enabled'))
    BluetoothSerial.on('bluetoothDisabled', () => console.log('Bluetooth disabled'))
    BluetoothSerial.on('error', (err) => console.log(`Error: ${err.message}`))
    BluetoothSerial.on('connectionLost', () => {
      if (this.state.device) {
        console.log(`Connection to device ${this.state.device.name} has been lost`)
      }
      this.setState({ connected: false })
    })
  }

  cancelDiscovery () {
    if (this.state.discovering) {
      BluetoothSerial.cancelDiscovery()
      .then(() => {
        this.setState({ discovering: false })
      })
      .catch((err) => console.log(err.message))
    }
  }

  pairDevice (device) {
    BluetoothSerial.pairDevice(device.id)
    .then((paired) => {
      if (paired) {
        console.log(`Device ${device.name} paired successfully`)
        const devices = this.state.devices
        devices.push(device)
        this.setState({ devices, unpairedDevices: this.state.unpairedDevices.filter((d) => d.id !== device.id) })
      } else {
        console.log(`Device ${device.name} pairing failed`)
      }
    })
    .catch((err) => console.log(err.message))
  }

  connect (device) {
    this.setState({ connecting: true })
    BluetoothSerial.connect(device.id)
    .then((res) => {
      console.log(`Connected to device ${device.name}`)
      this.setState({ device, connected: true, connecting: false })
    })
    .catch((err) => console.log(err.message))
  }

  disconnect () {
    BluetoothSerial.disconnect()
    .then(() => this.setState({ connected: false }))
    .catch((err) => console.log(err.message))
  }

  enable () {
    BluetoothSerial.enable()
    .then((res) => this.setState({ isEnabled: true }))
    .catch((err) => console.log(err.message))
  }

  disable () {
    BluetoothSerial.disable()
    .then((res) => this.setState({ isEnabled: false }))
    .catch((err) => console.log(err.message))
  }

  write (message) {
    if (!this.state.connected) {
      console.log('You must connect to device first')
    }

    BluetoothSerial.write(message)
    .then((res) => {
      console.log('Successfuly wrote to device')
      this.setState({ connected: true })
    })
    .catch((err) => console.log(err.message))
  }

  onDevicePress (device) {
    if (this.state.section === 0) {
      this.connect(device)
    } else {
      this.pairDevice(device)
    }
  }

  toggleBluetooth (value) {
    if (value === true) {
      this.enable()
    } else {
      this.disable()
    }
  }

  render() {
    const activeTabStyle = { borderBottomWidth: 6, borderColor: '#009688' }
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.heading}>Bluetooth Serial Example</Text>
          {Platform.OS === 'android'
          ? (
            <View style={styles.enableInfoWrapper}>
              <Text style={{ fontSize: 12, color: '#FFFFFF' }}>
                {this.state.isEnabled ? 'disable' : 'enable'}
              </Text>
              <Switch
                onValueChange={this.toggleBluetooth.bind(this)}
                value={this.state.isEnabled} />
            </View>
          ) : null}
        </View>
        {Platform.OS === 'android'
        ? (
          <View style={[styles.topBar, { justifyContent: 'center', paddingHorizontal: 0 }]}>
            <TouchableOpacity style={[styles.tab, this.state.section === 0 && activeTabStyle]} onPress={() => this.setState({ section: 0 })}>
              <Text style={{ fontSize: 14, color: '#FFFFFF' }}>PAIRED DEVICES</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, this.state.section === 1 && activeTabStyle]} onPress={() => this.setState({ section: 1 })}>
              <Text style={{ fontSize: 14, color: '#FFFFFF' }}>MOVEMENT</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {this.state.discovering && this.state.section === 1
        ? (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator
              style={{ marginBottom: 15 }}
              size={60} />
            <Button
              textStyle={{ color: '#FFFFFF' }}
              style={styles.buttonRaised}
              title='Cancel Discovery'
              onPress={() => this.cancelDiscovery()} />
          </View>
        ) : (
          <DeviceList
            showConnectedIcon={this.state.section === 0}
            connectedId={this.state.device && this.state.device.id}
            devices={this.state.section === 0 ? this.state.devices : this.state.unpairedDevices}
            onDevicePress={(device) => this.onDevicePress(device)} />
        )}
        <Button
          textStyle={{ color: '#FFFFFF' }}
          style={styles.buttonRaised}
          title='START'
          onPress={() => this.write("1")} // ASCII 49
        />
        <View style={{ flexDirection: "row" }}>
          <Button
            textStyle={{ color: '#FFFFFF' }}
            style={styles.buttonRaised}
            title='LEFT'
            onPress={() => this.write("2")} // ASCII 50
          />
          <Button
            textStyle={{ color: '#FFFFFF' }}
            style={styles.buttonRaised}
            title='STOP'
            onPress={() => this.write("0")} // ASCII 48
          />
          <Button
            textStyle={{ color: '#FFFFFF' }}
            style={styles.buttonRaised}
            title='RIGHT'
            onPress={() => this.write("3")} // ASCII 51
          />
        </View>
        <Button
          textStyle={{ color: '#FFFFFF' }}
          style={styles.buttonRaised}
          title='REVERSE'
          onPress={() => this.write("4")} // ASCII 52
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  topBar: { 
    height: 56, 
    paddingHorizontal: 16,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' ,
    elevation: 6,
    backgroundColor: '#7B1FA2'
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 16,
    alignSelf: 'center',
    color: '#FFFFFF'
  },
  enableInfoWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  tab: { 
    alignItems: 'center', 
    flex: 0.5, 
    height: 56, 
    justifyContent: 'center', 
    borderBottomWidth: 6, 
    borderColor: 'transparent' 
  },
  connectionInfoWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25
  },
  connectionInfo: {
    fontWeight: 'bold',
    alignSelf: 'center',
    fontSize: 18,
    marginVertical: 10,
    color: '#238923'
  },
  listContainer: {
    borderColor: '#ccc',
    borderTopWidth: 0.5
  },
  listItem: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    borderColor: '#ccc',
    borderBottomWidth: 0.5,
    justifyContent: 'center'
  },
  fixedFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },
  button: {
    height: 36,
    margin: 5,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: '#7B1FA2',
    fontWeight: 'bold',
    fontSize: 14
  },
  buttonRaised: {
    backgroundColor: '#7B1FA2',
    borderRadius: 2,
    elevation: 2
  }
});
