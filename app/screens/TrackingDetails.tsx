import { useEffect, useState } from 'react';
import { YStack, H3, Paragraph, Stack, ScrollView, Text, Separator, H4, Button } from 'tamagui';
import dayjs from 'dayjs';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL; // Use the base URL from .env
const API_KEY = process.env.EXPO_PUBLIC_TRACKING_API_KEY;
const SERVER_DELETE_TRACKING_URL = `${BASE_URL}/delete_tracking`; // Endpoint for registering token


interface TrackingData {
  data: {
    accepted: Array<{
      number: string;
      track_info: {
        latest_event?: {
          description: string;
          time_iso: string;
          location: string;
        };
        latest_status?: {
          status: string;
        };
        shipping_info?: {
          shipper_address?: {
            city: string;
            state: string;
            country: string;
          };
          recipient_address?: {
            city: string;
            state: string;
            country: string;
          };
        };
        tracking?: {
          providers: Array<{
            provider: {
              name: string;
              tel: string;
              homepage: string;
            };
            events: Array<{
              description: string;
              time_iso: string;
              location: string;
            }>;
          }>;
        };
      };
    }>;
  };
}

export default function TrackingDetailsPage() {
  const { trackingNumber } = useLocalSearchParams();
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    if (trackingNumber) fetchTrackingDetails(trackingNumber as string);

    // Set custom title
    navigation.setOptions({
      title: "Detailed Information",
    });
  }, [trackingNumber]);

  const fetchTrackingDetails = async (number: string) => {
    try {
      const response = await axios.post(
        'https://api.17track.net/track/v2.2/gettrackinfo',
        [{ number }],
        { headers: { '17token': API_KEY } }
      );
      if (response.data.data?.accepted?.length) {
        setTrackingData(response.data);
      } else {
        setError("No tracking data found for this number.");
      }
    } catch (err) {
      console.error("Error fetching tracking details:", err.message);
      setError("Failed to retrieve tracking details. Please try again.");
    }
  };

  const deleteTrackingNumber = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        setDeleteStatus("User ID not found.");
        return;
      }

      // Step 1: Delete the tracking number from 17Track API
      const response17Track = await axios.post(
        'https://api.17track.net/track/v2.2/deletetrack',
        [{ number: trackingNumber }],
        { headers: { '17token': API_KEY } }
      );

      if (response17Track.data.code === 0) {
        console.log("Tracking number deleted from 17Track successfully.");

        // Step 2: Delete the tracking number from your FastAPI server
        const responseFastAPI = await axios.delete(SERVER_DELETE_TRACKING_URL, {
          data: { 
            tracking_number: trackingNumber,
            user_id: userId,
          }
        });

        if (responseFastAPI.data.status === "success") {
          setDeleteStatus("Tracking number deleted successfully.");
          setTrackingData(null);
          router.push('/(tabs)/MonitoredDeliveries');
        } else {
          setDeleteStatus("Failed to delete tracking number from local server. Please try again.");
        }
      } else {
        setDeleteStatus("Failed to delete tracking number from 17Track. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting tracking number:", err.message);
      setDeleteStatus("Failed to delete tracking number. Please try again.");
    }
  };

  // Ensure that trackingData and its properties are safely accessed
  const trackInfo = trackingData?.data?.accepted?.[0]?.track_info;
  const latestStatus = trackInfo?.latest_status?.status;

  if (!trackInfo) return <Paragraph ta="center" mt="$4">{error || "Loading..."}</Paragraph>;

  const { latest_event: latestEvent, shipping_info: shippingInfo, tracking } = trackInfo;

  const formattedEvents = tracking?.providers?.[0]?.events?.map(event => ({
    date: dayjs(event.time_iso).format('MMMM D, YYYY - h:mm A'),
    description: event.description,
    location: event.location,
  })) || [];

  return (
    <ScrollView>
      <YStack f={1} p="$5" ai="center" bg="$background" gap="$4">
        <H3>Tracking Details</H3>

        {/* Not Found Status Message */}
{latestStatus === "NotFound" && (
  <Paragraph ta="center" mt="$3" color="$red10" fontWeight="bold">
    Tracking not found. Please try deleting it and re-adding with a specific courier.
  </Paragraph>
)}


        {/* Quick Details */}
        <Stack w="90%" bg="$gray3" br="$4" p="$4" mb="$3">
          <H4>Quick Details</H4>
          <Text>Tracking Number: {trackingNumber}</Text>
          <Paragraph>
            Status:{" "}
            <Text
              fontWeight={latestStatus === "Delivered" ? "bold" : "normal"}
              color={latestStatus === "Delivered" ? "$green10" : "$text"}
            >
              {latestStatus || "Unknown"}
            </Text>
          </Paragraph>
        </Stack>

        {/* Shipping Information */}
        <Stack w="90%" bg="$gray3" br="$4" p="$4" mb="$3">
          <H4>Shipping Information</H4>
          <Text>Origin: {shippingInfo?.shipper_address?.city || "Unknown"}, {shippingInfo?.shipper_address?.state || ""}, {shippingInfo?.shipper_address?.country || ""}</Text>
          <Text>Destination: {shippingInfo?.recipient_address?.city || "Unknown"}, {shippingInfo?.recipient_address?.state || ""}, {shippingInfo?.recipient_address?.country || ""}</Text>
        </Stack>

        {/* Latest Event */}
        <Stack w="90%" bg="$gray3" br="$4" p="$4" mb="$3">
          <H4>Latest Event</H4>
          <Paragraph><Text fontWeight="bold">Date: {dayjs(latestEvent?.time_iso).format('MMMM D, YYYY - h:mm A')}</Text></Paragraph>
          <Text>Description: {latestEvent?.description || "No recent updates"}</Text>
          <Text>Location: {latestEvent?.location || "N/A"}</Text>
        </Stack>

        {/* Courier Information */}
        <Stack w="90%" bg="$gray3" br="$4" p="$4" mb="$3">
          <H4>Courier Information</H4>
          <Text>Provider: {tracking?.providers?.[0]?.provider?.name}</Text>
          <Text>Contact: {tracking?.providers?.[0]?.provider?.tel}</Text>
          <Text>Website: {tracking?.providers?.[0]?.provider?.homepage}</Text>
        </Stack>

        {/* Tracking Events History */}
        <Stack w="90%" bg="$gray3" br="$4" p="$4" mb="$3">
          <H4>Tracking Events History</H4>
          {formattedEvents.map((event, index) => (
            <Stack key={index}>
              <Paragraph mb="$2" mt="$3">
                <Text fontWeight="bold">{event.date}</Text> - {event.description} ({event.location})
              </Paragraph>
              {index < formattedEvents.length - 1 && (
                <Separator marginVertical={5} width="100%" borderWidth={1} borderColor="$white11" />
              )}
            </Stack>
          ))}
        </Stack>

        {/* Delete Button */}
        <Button mt="$2" bg="$red10" color="white" onPress={deleteTrackingNumber}>
          Delete Tracking Number
        </Button>

        {/* Delete Status Message */}
        {deleteStatus && <Paragraph mt="$3" ta="center" color="$red10">{deleteStatus}</Paragraph>}
      </YStack>
    </ScrollView>
  );
}
