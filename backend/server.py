from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy import Column, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from databases import Database
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import httpx
import logging
from typing import Optional, List

app = FastAPI()
DATABASE_URL = "sqlite:///./test.db"

# SQLAlchemy setup
Base = declarative_base()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Async database connection
database = Database(DATABASE_URL)

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define Expo push notification server URL
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Custom exception handler for 422 errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_body = (await request.body()).decode("utf-8")
    logger.error(f"Validation error for request {request.url}")
    logger.error(f"Request body: {request_body}")
    logger.error(f"Validation error details: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": request_body,
        },
    )

# Define models for the nested JSON structure
class Coordinates(BaseModel):
    longitude: Optional[float]
    latitude: Optional[float]

class Address(BaseModel):
    country: Optional[str]
    state: Optional[str]
    city: Optional[str]
    street: Optional[str]
    postal_code: Optional[str]
    coordinates: Optional[Coordinates]

class ShippingInfo(BaseModel):
    shipper_address: Optional[Address]
    recipient_address: Optional[Address]

class LatestStatus(BaseModel):
    status: str
    sub_status: Optional[str]
    sub_status_descr: Optional[str]

class LatestEvent(BaseModel):
    time_iso: str
    time_utc: str
    description: str
    location: str
    address: Optional[Address]
    stage: Optional[str]
    sub_status: Optional[str]

class TimeMetrics(BaseModel):
    days_after_order: Optional[int]
    days_of_transit: Optional[int]
    days_of_transit_done: Optional[int]
    days_after_last_update: Optional[int]

class Milestone(BaseModel):
    key_stage: str
    time_iso: Optional[str]
    time_utc: Optional[str]

class TrackingEvent(BaseModel):
    time_iso: str
    time_utc: str
    description: str
    location: str
    stage: Optional[str]
    address: Optional[Address]

class Provider(BaseModel):
    key: int
    name: str
    alias: str
    homepage: Optional[str]

class ProviderInfo(BaseModel):
    provider: Provider
    service_type: Optional[str]
    latest_sync_status: Optional[str]
    latest_sync_time: Optional[str]
    events: Optional[List[TrackingEvent]]

class TrackingInfo(BaseModel):
    shipping_info: Optional[ShippingInfo]
    latest_status: LatestStatus
    latest_event: LatestEvent
    time_metrics: Optional[TimeMetrics]
    milestone: Optional[List[Milestone]]
    providers: Optional[List[ProviderInfo]] = None  # Allow providers to be optional

class Data(BaseModel):
    number: str
    carrier: int
    param: Optional[str]
    tag: Optional[str]
    track_info: TrackingInfo

class WebhookPayload(BaseModel):
    event: str
    data: Data


# Model definitions
class DeviceToken(Base):
    __tablename__ = "device_tokens"
    user_id = Column(String, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)

class TrackingNumber(Base):
    __tablename__ = "tracking_numbers"
    tracking_number = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)

# Create the tables
Base.metadata.create_all(bind=engine)

# Pydantic models for request bodies
class TokenRequest(BaseModel):
    user_id: str
    token: str

class TrackingRegistrationRequest(BaseModel):
    tracking_number: str
    user_id: str

class TrackingDeletionRequest(BaseModel):
    tracking_number: str
    user_id: str

# Dependency to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.post("/register_token")
async def register_token(request: TokenRequest, db: SessionLocal = Depends(get_db)):
    """
    Endpoint to register the Expo push token for a specific user.
    """
    # Check if the token for this user_id already exists
    existing_token = db.query(DeviceToken).filter(DeviceToken.user_id == request.user_id).first()
    if existing_token:
        existing_token.token = request.token  # Update the token if it already exists
    else:
        new_token = DeviceToken(user_id=request.user_id, token=request.token)
        db.add(new_token)

    db.commit()
    logger.info(f"Registered push token for user {request.user_id}")
    return {"status": "success", "message": "Token registered successfully"}

@app.post("/register_tracking")
async def register_tracking(request: TrackingRegistrationRequest, db: SessionLocal = Depends(get_db)):
    """
    Endpoint to register a tracking number and associate it with a user_id.
    """
    # Check if the tracking number already exists
    tracking_entry = db.query(TrackingNumber).filter(TrackingNumber.tracking_number == request.tracking_number).first()
    if not tracking_entry:
        tracking_entry = TrackingNumber(tracking_number=request.tracking_number, user_id=request.user_id)
        db.add(tracking_entry)
        db.commit()
        logger.info(f"Registered tracking number {request.tracking_number} for user {request.user_id}")
    return {"status": "success", "message": "Tracking number registered successfully"}

@app.delete("/delete_tracking")
async def delete_tracking(request: TrackingDeletionRequest, db: SessionLocal = Depends(get_db)):
    """
    Endpoint to delete a tracking number for a specific user.
    """
    # Find the tracking number for the specified user_id
    tracking_entry = db.query(TrackingNumber).filter(
        TrackingNumber.tracking_number == request.tracking_number,
        TrackingNumber.user_id == request.user_id
    ).first()

    if not tracking_entry:
        raise HTTPException(status_code=404, detail="Tracking number not found for user")

    # Delete the tracking entry
    db.delete(tracking_entry)
    db.commit()
    logger.info(f"Deleted tracking number {request.tracking_number} for user {request.user_id}")
    return {"status": "success", "message": "Tracking number deleted successfully"}

async def send_expo_push_notification(user_id: str, message: str):
    """
    Sends a push notification to an Expo client using a stored token.
    """
    query = "SELECT token FROM device_tokens WHERE user_id = :user_id"
    row = await database.fetch_one(query=query, values={"user_id": user_id})

    if not row:
        raise HTTPException(status_code=404, detail="Push token not found for user")

    token = row["token"]
    async with httpx.AsyncClient() as client:
        payload = {
            "to": token,
            "sound": "default",
            "body": message,
            "title": "Tracking Update",
        }
        response = await client.post(EXPO_PUSH_URL, json=payload)
        logger.info(f"Push notification sent. Status: {response.status_code}, Response: {response.json()}")
        return response.json()

@app.post("/webhook")
async def receive_webhook(payload: WebhookPayload):
    tracking_number = payload.data.number
    latest_status = payload.data.track_info.latest_status.status
    latest_event_description = payload.data.track_info.latest_event.description

    # Find user_id associated with this tracking number
    query = "SELECT user_id FROM tracking_numbers WHERE tracking_number = :tracking_number"
    row = await database.fetch_one(query=query, values={"tracking_number": tracking_number})

    if not row:
        raise HTTPException(status_code=404, detail="User ID not found for tracking number")

    user_id = row["user_id"]

    # Generate notification message
    message = f"Your package ({tracking_number}) has an update: {latest_status}. Event: {latest_event_description}."

    # Send the notification using the found user_id
    await send_expo_push_notification(user_id, message)

    return {"status": "received"}
