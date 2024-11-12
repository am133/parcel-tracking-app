import { useEffect, useState, useCallback } from 'react';
import { Paragraph, ScrollView, Stack, Button, YStack, H2, SizableText } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';

const API_KEY = process.env.EXPO_PUBLIC_TRACKING_API_KEY;

interface TrackingInfo {
  number: string;
  package_status?: string;
  latest_event_info?: string;
  latest_event_time?: string;
}

export default function TabTwoScreen() {
  const [trackingList, setTrackingList] = useState<TrackingInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchTrackingList = async () => {
    setError(null);
    try {
      const response = await axios.post(
        'https://api.17track.net/track/v2.2/gettracklist',
        {
          page_no: 1,
          data_origin: 'Api',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            '17token': API_KEY,
          },
        }
      );

      const trackingData: TrackingInfo[] = (response.data?.data?.accepted || []).map((item: any) => ({
        number: item.number,
        package_status: item.package_status,
        latest_event_info: item.latest_event_info,
        latest_event_time: item.latest_event_time,
      }));
      
      setTrackingList(trackingData);
    } catch (err) {
      console.error("Error fetching tracking list:", err.message);
      setError("Failed to retrieve tracking list. Please try again.");
    }
  };

  const handleSelectTracking = (trackingNumber: string) => {
    router.push({
      pathname: '/screens/TrackingDetails',
      params: { trackingNumber },
    });
  };

  useFocusEffect(
    useCallback(() => {
      // Refresh tracking list each time screen is focused
      fetchTrackingList();
    }, [])
  );

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" bg="$background" p="$4">
      <H2 fontSize={24} color="$blue10">Currently Tracked Numbers</H2>

      {error && (
        <Paragraph color="red" ta="center" mt="$2">
          {error}
        </Paragraph>
      )}

<ScrollView style={{ width: '100%', marginTop: 16 }}>
  {trackingList.length === 0 && !error ? (
    <Paragraph ta="center" mt="$4">No tracked numbers found.</Paragraph>
  ) : (
    trackingList.map((item, index) => (
      <TouchableOpacity key={index} onPress={() => handleSelectTracking(item.number)}>
        <Stack bg="$gray3" p="$3" mb="$2" br="$4">
          <Paragraph>
            <SizableText fontWeight="bold">Tracking Number</SizableText>
            <SizableText>: {item.number}</SizableText>
          </Paragraph>
          <Paragraph>
            <SizableText fontWeight="bold">Status</SizableText>
            <SizableText>: {item.package_status || "Unknown"}</SizableText>
          </Paragraph>
          <Paragraph>
            <SizableText fontWeight="bold">Last Update</SizableText>
            <SizableText>: {item.latest_event_info || "No recent updates"}</SizableText>
          </Paragraph>
          <Paragraph>
            <SizableText fontWeight="bold">Last Updated Time</SizableText>
            <SizableText>: {item.latest_event_time 
              ? dayjs(item.latest_event_time).format('MMMM D, YYYY h:mm A') 
              : "N/A"}
            </SizableText>
          </Paragraph>
        </Stack>
      </TouchableOpacity>
    ))
  )}
</ScrollView>


      <Button themeInverse mt="$4" onPress={fetchTrackingList}>Refresh List</Button>
    </YStack>
  );
}
