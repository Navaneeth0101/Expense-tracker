from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class ExpenseCreate(BaseModel):
    amount: float
    category: str
    date: str  # ISO format date string
    note: Optional[str] = ""

class Expense(BaseModel):
    id: str
    amount: float
    category: str
    date: str
    note: str
    created_at: str

class SubscriptionCreate(BaseModel):
    name: str
    amount: float
    renewal_date: str  # ISO format date string

class Subscription(BaseModel):
    id: str
    name: str
    amount: float
    renewal_date: str
    created_at: str

class MonthlySummary(BaseModel):
    month: str
    year: int
    total_spent: float
    expense_count: int

class CategoryBreakdown(BaseModel):
    category: str
    amount: float
    percentage: float

class HighExpenseMonth(BaseModel):
    month: str
    year: int
    subscription_count: int
    estimated_cost: float
    subscription_names: List[str]

# Helper function to convert MongoDB document to dict
def expense_helper(expense) -> dict:
    return {
        "id": str(expense["_id"]),
        "amount": expense["amount"],
        "category": expense["category"],
        "date": expense["date"],
        "note": expense.get("note", ""),
        "created_at": expense["created_at"]
    }

def subscription_helper(subscription) -> dict:
    return {
        "id": str(subscription["_id"]),
        "name": subscription["name"],
        "amount": subscription["amount"],
        "renewal_date": subscription["renewal_date"],
        "created_at": subscription["created_at"]
    }

# Expense Endpoints
@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense: ExpenseCreate):
    expense_dict = expense.dict()
    expense_dict["created_at"] = datetime.utcnow().isoformat()
    result = await db.expenses.insert_one(expense_dict)
    created_expense = await db.expenses.find_one({"_id": result.inserted_id})
    return expense_helper(created_expense)

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses():
    expenses = await db.expenses.find().sort("date", -1).to_list(1000)
    return [expense_helper(expense) for expense in expenses]

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    try:
        result = await db.expenses.delete_one({"_id": ObjectId(expense_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
        return {"message": "Expense deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/expenses/monthly-summary")
async def get_monthly_summary():
    now = datetime.utcnow()
    current_month = now.month
    current_year = now.year
    
    # Get all expenses for current month
    expenses = await db.expenses.find().to_list(1000)
    
    total_spent = 0
    expense_count = 0
    
    for expense in expenses:
        expense_date = datetime.fromisoformat(expense["date"].replace('Z', '+00:00'))
        if expense_date.month == current_month and expense_date.year == current_year:
            total_spent += expense["amount"]
            expense_count += 1
    
    month_names = ["January", "February", "March", "April", "May", "June", 
                   "July", "August", "September", "October", "November", "December"]
    
    return {
        "month": month_names[current_month - 1],
        "year": current_year,
        "total_spent": round(total_spent, 2),
        "expense_count": expense_count
    }

@api_router.get("/expenses/category-breakdown")
async def get_category_breakdown():
    expenses = await db.expenses.find().to_list(1000)
    
    category_totals = defaultdict(float)
    total_amount = 0
    
    for expense in expenses:
        category_totals[expense["category"]] += expense["amount"]
        total_amount += expense["amount"]
    
    breakdown = []
    for category, amount in category_totals.items():
        percentage = (amount / total_amount * 100) if total_amount > 0 else 0
        breakdown.append({
            "category": category,
            "amount": round(amount, 2),
            "percentage": round(percentage, 1)
        })
    
    # Sort by amount descending
    breakdown.sort(key=lambda x: x["amount"], reverse=True)
    return breakdown

# Subscription Endpoints
@api_router.post("/subscriptions", response_model=Subscription)
async def create_subscription(subscription: SubscriptionCreate):
    subscription_dict = subscription.dict()
    subscription_dict["created_at"] = datetime.utcnow().isoformat()
    result = await db.subscriptions.insert_one(subscription_dict)
    created_subscription = await db.subscriptions.find_one({"_id": result.inserted_id})
    return subscription_helper(created_subscription)

@api_router.get("/subscriptions", response_model=List[Subscription])
async def get_subscriptions():
    subscriptions = await db.subscriptions.find().sort("renewal_date", 1).to_list(1000)
    return [subscription_helper(subscription) for subscription in subscriptions]

@api_router.delete("/subscriptions/{subscription_id}")
async def delete_subscription(subscription_id: str):
    try:
        result = await db.subscriptions.delete_one({"_id": ObjectId(subscription_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Subscription not found")
        return {"message": "Subscription deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/subscriptions/high-expense-months")
async def get_high_expense_months():
    subscriptions = await db.subscriptions.find().to_list(1000)
    
    # Group subscriptions by month and year
    month_groups = defaultdict(lambda: {"count": 0, "total": 0, "names": []})
    
    for subscription in subscriptions:
        renewal_date = datetime.fromisoformat(subscription["renewal_date"].replace('Z', '+00:00'))
        key = f"{renewal_date.year}-{renewal_date.month}"
        month_groups[key]["count"] += 1
        month_groups[key]["total"] += subscription["amount"]
        month_groups[key]["names"].append(subscription["name"])
        month_groups[key]["month"] = renewal_date.month
        month_groups[key]["year"] = renewal_date.year
    
    # Find months with multiple subscriptions
    high_expense_months = []
    month_names = ["January", "February", "March", "April", "May", "June", 
                   "July", "August", "September", "October", "November", "December"]
    
    for key, data in month_groups.items():
        if data["count"] >= 2:  # At least 2 subscriptions
            high_expense_months.append({
                "month": month_names[data["month"] - 1],
                "year": data["year"],
                "subscription_count": data["count"],
                "estimated_cost": round(data["total"], 2),
                "subscription_names": data["names"]
            })
    
    # Sort by estimated cost descending
    high_expense_months.sort(key=lambda x: x["estimated_cost"], reverse=True)
    return high_expense_months

@api_router.get("/")
async def root():
    return {"message": "Expense Tracker API is running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
