import math
import os
from datetime import datetime
from typing import Optional

import stripe
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, create_engine, or_
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# ==========================================
# 1. INITIALIZATION & DATABASE SETUP
# ==========================================
DATABASE_URL = "sqlite:///./greens_acc_workspace.db"
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI(title="Greens ACC - Unified Command Matrix")
security_jwt = HTTPBearer(auto_error=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# 2. CORE STORAGE MODELS
# ==========================================
class EmployeeModel(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)


class PolicyModel(Base):
    __tablename__ = "workplace_policies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    version = Column(String, default="1.0")
    created_at = Column(DateTime, default=datetime.utcnow)


class AttendanceModel(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False)
    sign_in_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    sign_out_time = Column(DateTime, nullable=True)
    acknowledged_policy_id = Column(Integer, ForeignKey("workplace_policies.id"), nullable=True)


class DealModel(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=False)
    legal_terms = Column(Text, nullable=False)
    creator_id = Column(String, nullable=False)
    word_count = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)


class DealAccessModel(Base):
    __tablename__ = "deal_access"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False)
    stripe_session_id = Column(String, unique=True, nullable=False)
    paid_at = Column(DateTime, default=datetime.utcnow)


class MessageModel(Base):
    __tablename__ = "communication_portal"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False)
    sender_id = Column(String, nullable=False)
    receiver_id = Column(String, nullable=False)
    message_text = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)


class UserBehaviorLogModel(Base):
    """Tracks how users interact with text frameworks, deal times, and views."""

    __tablename__ = "user_behavior_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    action_type = Column(String, nullable=False)
    deal_id = Column(Integer, nullable=True)
    time_spent_seconds = Column(Integer, default=0)
    interaction_timestamp = Column(DateTime, default=datetime.utcnow)


class TaskModel(Base):
    """Admin centralized operational dashboard tasks assigned to employees."""

    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False)
    title = Column(String, nullable=False)
    status = Column(String, default="pending")
    admin_notes = Column(Text, nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class MeetingRoomModel(Base):
    """Custom unified team communication room mapping."""

    __tablename__ = "meeting_rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# ==========================================
# 3. DATA TRANSFER SCHEMAS
# ==========================================
class EmployeeCreate(BaseModel):
    employee_id: str
    full_name: str
    role: str


class PolicyCreate(BaseModel):
    title: str
    content: str
    version: str = "1.0"


class SignInRequest(BaseModel):
    employee_id: str
    policy_id_to_acknowledge: Optional[int] = None


class SignOutRequest(BaseModel):
    employee_id: str


class DealCreate(BaseModel):
    title: str
    description: str
    requirements: str
    legal_terms: str
    creator_id: str
    word_count: Optional[int] = 120


class DealUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    legal_terms: Optional[str] = None


class MessageSend(BaseModel):
    deal_id: int
    sender_id: str
    receiver_id: str
    message_text: str


class PaymentCheckoutRequest(BaseModel):
    user_id: str
    deal_id: int
    success_url: str
    cancel_url: str


class BehaviorLogPayload(BaseModel):
    user_id: str
    action_type: str
    deal_id: Optional[int] = None
    time_spent_seconds: int


class TaskCreate(BaseModel):
    employee_id: str
    title: str
    admin_notes: Optional[str] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None


class MeetingCreate(BaseModel):
    room_name: str


# ==========================================
# 4. RUNTIME OPERATIONS & BUSINESS LOGIC
# ==========================================
@app.get("/api/admin/system-state")
def get_system_state(credentials: HTTPAuthorizationCredentials = Depends(security_jwt)):
    if not credentials or credentials.credentials != "hassan123":
        raise HTTPException(status_code=403, detail="Unauthorized Super Controller Identity")
    return {"status": "ONLINE", "active_viewers": 1}


@app.post("/api/admin/employees", status_code=status.HTTP_201_CREATED)
def register_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    db_emp = db.query(EmployeeModel).filter(EmployeeModel.employee_id == employee.employee_id).first()
    if db_emp:
        raise HTTPException(status_code=400, detail="Employee ID already registered.")

    new_employee = EmployeeModel(
        employee_id=employee.employee_id,
        full_name=employee.full_name,
        role=employee.role,
    )
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    return {"status": "success", "data": employee}


@app.post("/api/admin/policies", status_code=status.HTTP_201_CREATED)
def publish_policy(policy: PolicyCreate, db: Session = Depends(get_db)):
    new_policy = PolicyModel(title=policy.title, content=policy.content, version=policy.version)
    db.add(new_policy)
    db.commit()
    db.refresh(new_policy)
    return {"status": "success", "policy_id": new_policy.id}


@app.get("/api/policies/latest")
def get_latest_policy(db: Session = Depends(get_db)):
    policy = db.query(PolicyModel).order_by(PolicyModel.created_at.desc()).first()
    if not policy:
        return {"policy_id": None, "title": "No active policies published", "content": ""}
    return policy


@app.post("/api/workspace/sign-in")
def employee_sign_in(payload: SignInRequest, db: Session = Depends(get_db)):
    emp = (
        db.query(EmployeeModel)
        .filter(EmployeeModel.employee_id == payload.employee_id, EmployeeModel.is_active.is_(True))
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Active employee profile not found.")

    active_session = (
        db.query(AttendanceModel)
        .filter(AttendanceModel.employee_id == payload.employee_id, AttendanceModel.sign_out_time.is_(None))
        .first()
    )
    if active_session:
        return {"status": "already_signed_in", "session_id": active_session.id}

    new_session = AttendanceModel(
        employee_id=payload.employee_id,
        sign_in_time=datetime.utcnow(),
        acknowledged_policy_id=payload.policy_id_to_acknowledge,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return {"status": "success", "session_id": new_session.id}


@app.post("/api/workspace/sign-out")
def employee_sign_out(payload: SignOutRequest, db: Session = Depends(get_db)):
    active_session = (
        db.query(AttendanceModel)
        .filter(AttendanceModel.employee_id == payload.employee_id, AttendanceModel.sign_out_time.is_(None))
        .order_by(AttendanceModel.sign_in_time.desc())
        .first()
    )
    if not active_session:
        raise HTTPException(status_code=400, detail="No active sign-in session found.")

    active_session.sign_out_time = datetime.utcnow()
    db.commit()
    return {"status": "success"}


@app.get("/api/admin/dashboard/status")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    active_sessions = (
        db.query(AttendanceModel, EmployeeModel)
        .join(EmployeeModel, AttendanceModel.employee_id == EmployeeModel.employee_id)
        .filter(AttendanceModel.sign_out_time.is_(None))
        .all()
    )

    current_active = []
    for session, employee in active_sessions:
        current_active.append(
            {
                "employee_id": employee.employee_id,
                "name": employee.full_name,
                "role": employee.role,
                "signed_in_at": session.sign_in_time,
            }
        )

    return {"total_currently_signed_in": len(current_active), "active_roster": current_active}


@app.post("/api/admin/tasks")
def create_workspace_task(task: TaskCreate, db: Session = Depends(get_db)):
    employee = db.query(EmployeeModel).filter(EmployeeModel.employee_id == task.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found.")

    new_task = TaskModel(employee_id=task.employee_id, title=task.title, admin_notes=task.admin_notes)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return {"status": "task_created", "task_id": new_task.id}


@app.put("/api/admin/tasks/{task_id}")
def update_workspace_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task assignment record not found.")

    if payload.status:
        allowed = {"pending", "working", "completed", "blocked"}
        if payload.status not in allowed:
            raise HTTPException(status_code=400, detail="Invalid task status.")
        task.status = payload.status
        if payload.status == "completed":
            task.completed_at = datetime.utcnow()

    if payload.admin_notes is not None:
        task.admin_notes = payload.admin_notes

    db.commit()
    return {"status": "task_updated"}


@app.post("/api/deals", status_code=status.HTTP_201_CREATED)
def publish_deal(deal: DealCreate, db: Session = Depends(get_db)):
    new_deal = DealModel(
        title=deal.title,
        description=deal.description,
        requirements=deal.requirements,
        legal_terms=deal.legal_terms,
        creator_id=deal.creator_id,
        word_count=deal.word_count,
    )
    db.add(new_deal)
    db.commit()
    db.refresh(new_deal)
    return {"status": "success", "deal_id": new_deal.id}


@app.put("/api/deals/{deal_id}")
def update_deal(deal_id: int, payload: DealUpdate, user_id: str, db: Session = Depends(get_db)):
    deal = db.query(DealModel).filter(DealModel.id == deal_id).first()
    if not deal or deal.creator_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized action or missing record.")

    if hasattr(payload, "model_dump"):
        updates = payload.model_dump(exclude_unset=True)
    else:
        updates = payload.dict(exclude_unset=True)

    for key, value in updates.items():
        setattr(deal, key, value)

    db.commit()
    return {"status": "success", "message": "Deal modified successfully."}


@app.post("/api/payments/checkout-session")
def create_checkout_session(payload: PaymentCheckoutRequest, db: Session = Depends(get_db)):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe configuration is missing.")

    deal = db.query(DealModel).filter(DealModel.id == payload.deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"Unlock Deal: {deal.title}",
                            "description": "Security identity check and legal requirement access fee.",
                        },
                        "unit_amount": 2000,
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=(
                f"{payload.success_url}?session_id={{CHECKOUT_SESSION_ID}}&deal_id={deal.id}&user_id={payload.user_id}"
            ),
            cancel_url=payload.cancel_url,
        )
        return {"checkout_url": session.url}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/payments/verify-success")
def verify_payment_success(session_id: str, deal_id: int, user_id: str, db: Session = Depends(get_db)):
    if not stripe.api_key:
        return {"access_granted": False}

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == "paid":
            existing = db.query(DealAccessModel).filter(DealAccessModel.stripe_session_id == session_id).first()
            if not existing:
                access = DealAccessModel(user_id=user_id, deal_id=deal_id, stripe_session_id=session_id)
                db.add(access)
                db.commit()
            return {"access_granted": True}
    except Exception:
        return {"access_granted": False}

    return {"access_granted": False}


@app.get("/api/deals/{deal_id}")
def get_deal_details(deal_id: int, user_id: str, db: Session = Depends(get_db)):
    deal = db.query(DealModel).filter(DealModel.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    if deal.creator_id == user_id:
        return deal

    has_access = (
        db.query(DealAccessModel)
        .filter(DealAccessModel.user_id == user_id, DealAccessModel.deal_id == deal_id)
        .first()
    )
    if not has_access:
        return {
            "id": deal.id,
            "title": deal.title,
            "description": deal.description,
            "requires_payment": True,
            "cost": "$20.00",
        }

    return deal


@app.post("/api/communication/messages")
def send_secure_message(msg: MessageSend, db: Session = Depends(get_db)):
    deal = db.query(DealModel).filter(DealModel.id == msg.deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal context missing.")

    if deal.creator_id != msg.sender_id:
        has_access = (
            db.query(DealAccessModel)
            .filter(DealAccessModel.user_id == msg.sender_id, DealAccessModel.deal_id == msg.deal_id)
            .first()
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="Communication portal locked.")

    new_msg = MessageModel(
        deal_id=msg.deal_id,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        message_text=msg.message_text,
    )
    db.add(new_msg)
    db.commit()
    return {"status": "sent"}


@app.get("/api/communication/rooms/{deal_id}")
def get_chat_history(deal_id: int, user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(MessageModel)
        .filter(
            MessageModel.deal_id == deal_id,
            or_(MessageModel.sender_id == user_id, MessageModel.receiver_id == user_id),
        )
        .order_by(MessageModel.sent_at.asc())
        .all()
    )


@app.post("/api/meetings/rooms")
def launch_meeting_room(payload: MeetingCreate, db: Session = Depends(get_db)):
    room = db.query(MeetingRoomModel).filter(MeetingRoomModel.room_name == payload.room_name).first()
    if not room:
        room = MeetingRoomModel(room_name=payload.room_name, is_active=True)
        db.add(room)
        db.commit()
        db.refresh(room)

    return {
        "status": "active",
        "room_link_id": room.room_name,
        "embed_url": f"https://meet.jit.si/{room.room_name}",
    }


# ==========================================
# 5. BEHAVIOR STUDY ALGORITHMS & PREDICTIVE ANALYTICS
# ==========================================
@app.post("/api/analytics/log-behavior")
def register_user_interaction(payload: BehaviorLogPayload, db: Session = Depends(get_db)):
    log = UserBehaviorLogModel(
        user_id=payload.user_id,
        action_type=payload.action_type,
        deal_id=payload.deal_id,
        time_spent_seconds=payload.time_spent_seconds,
    )
    db.add(log)
    db.commit()
    return {"status": "captured"}


@app.get("/api/analytics/customer-patterns")
def analyze_customer_behaviors(db: Session = Depends(get_db)):
    logs = db.query(UserBehaviorLogModel).all()
    reading_times = [l.time_spent_seconds for l in logs if l.action_type == "read_view"]
    publish_events = [l for l in logs if l.action_type == "publish"]

    avg_read_time = math.fsum(reading_times) / len(reading_times) if reading_times else 0

    behavior_profile = "Inconclusive"
    if avg_read_time > 0:
        if avg_read_time < 5:
            behavior_profile = "High-velocity skimming (Potential scrapers/bots)"
        elif 5 <= avg_read_time <= 45:
            behavior_profile = "Targeted discovery reading (Looking for metrics)"
        else:
            behavior_profile = "Deep structural evaluation (Highly engaged target buyers)"

    return {
        "total_behavior_data_points": len(logs),
        "average_deal_reading_retention_seconds": round(avg_read_time, 2),
        "total_deals_published_volume": len(publish_events),
        "classified_audience_behavior_trend": behavior_profile,
    }


@app.get("/api/analytics/employee-projections/{employee_id}")
def analyze_employee_behavior_and_blockages(employee_id: str, db: Session = Depends(get_db)):
    emp = db.query(EmployeeModel).filter(EmployeeModel.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Target profile not found.")

    tasks = db.query(TaskModel).filter(TaskModel.employee_id == employee_id).all()
    attendance = db.query(AttendanceModel).filter(AttendanceModel.employee_id == employee_id).all()

    total_tasks = len(tasks)
    completed_tasks = [t for t in tasks if t.status == "completed"]
    blocked_tasks = [t for t in tasks if t.status == "blocked"]

    completion_rate = (len(completed_tasks) / total_tasks * 100) if total_tasks > 0 else 100.0
    blockage_ratio = (len(blocked_tasks) / total_tasks * 100) if total_tasks > 0 else 0.0

    weakness_indicators = []
    improvement_trends = []
    blockage_prediction = "Low Risk - Smooth Operational Path"

    if blockage_ratio >= 25.0:
        weakness_indicators.append("Prone to internal procedural dependencies or architectural stall.")
        blockage_prediction = "HIGH RISK - High volume of current dependencies threatening execution sprint deadlines."
    elif completion_rate < 50.0 and total_tasks > 2:
        weakness_indicators.append("Extended task processing delays detected. Resolution time requires oversight.")
        blockage_prediction = "MODERATE RISK - Incomplete backlog buildup stalling milestone deployment."

    if completion_rate > 75.0:
        improvement_trends.append("Demonstrates accelerated delivery velocity on independent feature blocks.")
    else:
        improvement_trends.append("Stable performance metrics maintained across basic workflows.")

    if not weakness_indicators:
        weakness_indicators.append("No critical workflow weakness detected from current telemetry.")

    return {
        "employee_id": employee_id,
        "name": emp.full_name,
        "metrics": {
            "total_assigned_tasks": total_tasks,
            "completion_percentage": round(completion_rate, 2),
            "active_block_percentage": round(blockage_ratio, 2),
            "total_logged_shifts": len(attendance),
        },
        "diagnostic_assessment": {
            "identified_weakness_nodes": weakness_indicators,
            "improvement_signals": improvement_trends,
            "predicted_operational_blockage": blockage_prediction,
        },
    }

from .security_command_center import router as security_router
app.include_router(security_router)
