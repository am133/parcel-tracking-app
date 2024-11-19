import { useState, useCallback, useEffect } from 'react';
import {
  YStack, Input, Button, Label, Paragraph, Stack, Select, Adapt, Sheet, H2, Spinner
} from 'tamagui';
import axios from 'axios';
import { ChevronDown, Check, Package } from '@tamagui/lucide-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const API_KEY = process.env.EXPO_PUBLIC_TRACKING_API_KEY;
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL; // Use the base URL from .env
const SERVER_URL = `${BASE_URL}/register_token`; // Endpoint for registering token
const SERVER_TRACKING_URL = `${BASE_URL}/register_tracking`; // Endpoint for registering tracking
const PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID;


interface TrackingPayload {
  number: string;
  carrier?: string;
}

const couriers = [
  { id: '', name: 'Auto Detect' },
  { id: '100003', name: 'FedEx' },
  { id: '100002', name: 'UPS' },
  { id: '100216', name: 'DHL' },
  { id: '21051', name: 'USPS' },
  { id: '100004', name: 'TNT' },
  { id: '100006', name: 'Aramex' },
  { id: '3041', name: 'Canada Post' },
  { id: '1151', name: 'Australia Post' },
  { id: '11031', name: 'Royal Mail' }
];

export default function DeliveryScreen() {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [userId, setUserId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initializeUserIdAndToken = async () => {
      // Generate or retrieve the user_id
      let storedUserId = await AsyncStorage.getItem('user_id');
      if (!storedUserId) {
        storedUserId = String(uuid.v4());
        await AsyncStorage.setItem('user_id', storedUserId);
      }
      setUserId(storedUserId);

      // Check if the token has already been registered
      const tokenRegistered = await AsyncStorage.getItem('token_registered');
      if (!tokenRegistered) {
        // Register for push notifications
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setExpoPushToken(token);
          
          // Send token and user_id to server
          axios.post(SERVER_URL, { user_id: storedUserId, token })
            .then(() => {
              console.log('Push token sent to server');
              AsyncStorage.setItem('token_registered', 'true'); // Mark as registered
            })
            .catch(err => console.error('Failed to send token:', err));
        }
      }
    };

    initializeUserIdAndToken();

    // Listener to handle notifications when the app is open
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notifications!');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })).data;
      console.log('Expo Push Token:', token);
      return token;
    } else {
      alert('Must use physical device for Push Notifications');
    }
  }

  const handleTrackingSubmit = async () => {
    setError(null);
    setRegistrationSuccess(false);

    if (!trackingNumber) {
      setError('Please enter a tracking number before proceeding.');
      return;
    }

    setLoading(true);
    try {
      // Check if tracking number is already registered in 17Track
      const checkRequestPayload: TrackingPayload[] = [{ number: trackingNumber }];
      const checkResponse = await axios.post(
        'https://api.17track.net/track/v2.2/gettrackinfo',
        checkRequestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            '17token': API_KEY,
          },
        }
      );

      const existingTrackingData = checkResponse.data?.data?.accepted?.[0];

      if (existingTrackingData) {
        setError('This tracking number is already registered. Check Monitored Deliveries for updates.');
        setLoading(false);
        return;
      }

      // Register tracking number in 17Track
      const registerPayload: TrackingPayload[] = [{ number: trackingNumber }];
      if (courier) {
        registerPayload[0].carrier = courier;
      }

      const registerResponse = await axios.post(
        'https://api.17track.net/track/v2.2/register',
        registerPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            '17token': API_KEY,
          },
        }
      );

      if (registerResponse.data.code === 0) {
        setRegistrationSuccess(true);

        // Send the tracking number and user_id to FastAPI server
        await axios.post(SERVER_TRACKING_URL, {
          tracking_number: trackingNumber,
          user_id: userId,
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Navigate to Monitored Deliveries after successful registration
        router.push('/(tabs)/MonitoredDeliveries');
      } else {
        setError("Failed to register tracking number.");
      }
    } catch (err) {
      console.error("Error retrieving tracking data:", err.response?.data || err.message);
      setError('Failed to retrieve tracking data. Please check the tracking number and try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setTrackingNumber('');
      setCourier('');
      setError(null);
      setRegistrationSuccess(false);
    }, [])
  );

  return (
    <YStack f={1} px="$6" py="$4" space="$4" bg="$background" jc="center">
      <H2 textAlign="center">Track New Delivery</H2>

      <Stack space="$2">
        <Label size="$5">Tracking Number</Label>
        <Input
          placeholder="Enter tracking number"
          value={trackingNumber}
          onChangeText={setTrackingNumber}
          width="100%"
          bg="$gray2"
          borderRadius="$4"
          px="$3"
          py="$2"
        />
      </Stack>

      <Stack space="$2">
        <Label size="$5">Courier</Label>
        <Select
          value={courier}
          onValueChange={setCourier}
        >
          <Select.Trigger iconAfter={ChevronDown}>
            <Select.Value placeholder="Auto Detect" />
          </Select.Trigger>

          <Adapt when="sm" platform="touch">
            <Sheet modal dismissOnSnapToBottom>
              <Sheet.Frame padding="$4" gap="$4">
                <Adapt.Contents />
              </Sheet.Frame>
              <Sheet.Overlay animation="quick" opacity={0.5} />
            </Sheet>
          </Adapt>

          <Select.Content zIndex={200000}>
            <Select.Viewport>
              <Select.Group>
                <Select.Label>Available Couriers</Select.Label>
                {couriers.map((courierItem) => (
                  <Select.Item key={courierItem.id} index={couriers.indexOf(courierItem)} value={courierItem.id}>
                    <Select.ItemText>{courierItem.name}</Select.ItemText>
                    <Select.ItemIndicator marginLeft="auto">
                      <Check size={16} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Viewport>
          </Select.Content>
        </Select>
      </Stack>

      <YStack gap="$4" alignItems="center" w="100%" mt="$4">
        <Button
          themeInverse
          size="$5"
          iconAfter={Package}
          onPress={handleTrackingSubmit}
          disabled={loading}
        >
          {loading ? <Spinner /> : 'Track'}
        </Button>
      </YStack>

      {error && (
        <Paragraph fos="$5" color="red" ta="center">
          {error}
        </Paragraph>
      )}
    </YStack>
  );
}
