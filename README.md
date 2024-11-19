
# Parcel Tracking App

A **React Native** application for tracking parcels, built with the **17Track API** for shipment tracking and **Tamagui** for a modern and responsive UI. The app communicates with a **FastAPI** backend for efficient server-side processing and token management.

---

## **Features**

- 📦 **Parcel Tracking**: Use the 17Track API to track shipments from multiple couriers.
- ✉️ **Push Notifications**: Get real-time updates on your parcel's status.
- 🖌️ **Responsive UI**: Built with **Tamagui**, ensuring a smooth and visually appealing experience.
- 🌐 **Backend Integration**: FastAPI backend for managing user data and push notifications.
- 🚛 **Courier Auto-Detection**: Automatically detect the courier for tracking numbers or manually select one.

---

## **Tech Stack**

### Frontend
- **React Native**: For building cross-platform mobile applications.
- **Tamagui**: For a consistent, customizable UI framework.

### Backend
- **FastAPI**: Python-based backend for handling API requests and user management.

### APIs
- **17Track API**: For retrieving tracking information.
- **Expo Notifications API**: For managing and delivering push notifications.

---

## **Screenshots**

<table>
  <tr>
    <td align="center">
      <h3>Landing Page</h3>
      <img src="https://i.imgur.com/VOtTnbA.png" alt="Landing Page" width="250" />
    </td>
    <td align="center">
      <h3>Monitored Deliveries</h3>
      <img src="https://i.imgur.com/s7gTugI.png" alt="Tracked Deliveries Page" width="250" />
    </td>
    <td align="center">
      <h3>Detailed Tracking</h3>
      <img src="https://i.imgur.com/LY4TOx0.png" alt="Detailed Tracking View" width="250" />
    </td>
    <td align="center">
      <h3>Tracking Events</h3>
      <img src="https://i.imgur.com/n4iJ2Ar.png" alt="Tracking Events" width="250" />
    </td>
  </tr>
</table>


---

## **Getting Started**

### Prerequisites

1. **Node.js** and **npm/yarn** installed on your machine.
2. **Expo CLI** installed globally:
   ```bash
   npm install -g expo-cli
   ```
3. **Python** (3.9 or above) and **FastAPI** installed for backend development.

---

### Frontend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/am133/parcel-tracking-app.git
   cd parcel-tracking-app
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Set up environment variables:
   - Create a `.env` file in the project root:
     ```plaintext
     EXPO_PUBLIC_TRACKING_API_KEY=<your-17track-api-key>
     EXPO_PUBLIC_BASE_URL=<your-backend-url>
     EXPO_PUBLIC_PROJECT_ID=<your-expo-project-id>
     ```

4. Start the development server:
   ```bash
   expo start
   ```

---

### Backend Setup

1. Navigate to the `backend/` directory (or wherever your backend code is located).
2. Create a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install fastapi uvicorn
   ```
4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```
5. The backend should now be running at `http://127.0.0.1:8000`.

---

## **Usage**

1. Enter your parcel's tracking number and select a courier or use auto-detect.
2. Receive updates on your parcel's status through the app or push notifications.

---

## **License**

This project is licensed under the [MIT License](LICENSE).

---

## **Acknowledgments**

- [Tamagui](https://tamagui.dev): For the elegant and flexible UI components.
- [17Track API](https://17track.net): For robust parcel tracking capabilities.
- [FastAPI](https://fastapi.tiangolo.com): For powering the backend services.
