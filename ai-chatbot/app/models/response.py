from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class ProductCardData(BaseModel):
    id: int
    slug: str
    name: str
    brand: str
    category: str
    price: float
    price_old: Optional[float] = None
    discount_percent: int = 0
    rating: float = 0.0
    reviews_count: int = 0
    stock: int = 0
    in_stock: bool = True
    image: str = ""
    product_url: str = ""
    reason: Optional[str] = None


class ProductComparisonRow(BaseModel):
    feature: str
    values: List[str]


class ProductComparisonData(BaseModel):
    products: List[ProductCardData]
    rows: List[ProductComparisonRow]
    verdict: Optional[str] = None


class PendingActionData(BaseModel):
    action_id: str
    action_type: Literal["add_to_cart", "update_cart_quantity", "remove_from_cart"]
    title: str
    summary: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class OrderItemCardData(BaseModel):
    product_name: str
    quantity: int = 1
    price: float = 0.0
    color: Optional[str] = None
    size: Optional[str] = None
    image_url: Optional[str] = None


class OrderCardData(BaseModel):
    id: int
    order_number: str
    status: str
    created_at: str = ""
    payment_method: str = ""
    payment_status: str = ""
    total: float = 0.0
    shipping_address: Optional[str] = None
    items: List[OrderItemCardData] = Field(default_factory=list)


class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    products: List[ProductCardData] = Field(default_factory=list)
    orders: List[OrderCardData] = Field(default_factory=list)
    comparison: Optional[ProductComparisonData] = None
    pending_action: Optional[PendingActionData] = None
    suggested_questions: List[str] = Field(default_factory=list)
    usage: Optional[TokenUsage] = None
    degraded: bool = False


class ActionResultResponse(BaseModel):
    success: bool
    message: str
    action_type: str
    data: Optional[Dict[str, Any]] = None
