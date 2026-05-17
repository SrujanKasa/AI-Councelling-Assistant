from pydantic import BaseModel, Field, BeforeValidator
from typing import Annotated, Optional, List
from datetime import datetime, timezone
import uuid
from bson import ObjectId


def validate_object_id(v):
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str):
        return v
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]


class BaseDocument(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}

    @classmethod
    def from_mongo(cls, doc: dict):
        if doc is None:
            return None
        return cls(**doc)

    def to_mongo(self) -> dict:
        d = self.model_dump(by_alias=True, exclude_none=True)
        if "_id" in d and d["_id"] is None:
            del d["_id"]
        return d


class User(BaseDocument):
    uid: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    password_hash: Optional[str] = None
    role: str = "user"
    is_premium: bool = False
    premium_expires_at: Optional[str] = None
    trial_start: Optional[str] = None
    rank: Optional[int] = None
    category: Optional[str] = None
    exam_type: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Prediction(BaseDocument):
    user_id: str
    exam_type: str  # TSEAMCET or JOSAA
    rank: int
    category: str
    gender: str
    results: List[dict] = []
    ai_insight: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Payment(BaseDocument):
    user_id: str
    order_id: str
    payment_id: Optional[str] = None
    amount: int = 5000
    currency: str = "INR"
    status: str = "created"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ConversationMessage(BaseModel):
    role: str
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Conversation(BaseDocument):
    user_id: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    exam_type: Optional[str] = None
    messages: List[ConversationMessage] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
