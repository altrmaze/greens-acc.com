from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./greens_acc_workspace.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI(title="Greens ACC - Employee Workspace & Policies API")
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
    content = Column(String, nullable=False)
    version = Column(String, default="1.0")
    created_at = Column(DateTime, default=datetime.utcnow)


class AttendanceModel(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=False)
    sign_in_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    sign_out_time = Column(DateTime, nullable=True)
    acknowledged_policy_id = Column(Integer, ForeignKey("workplace_policies.id"), nullable=True)


Base.metadata.create_all(bind=engine)


class EmployeeCreate(BaseModel):
    employee_id: str = Field(..., examples=["EMP-1024"])
    full_name: str = Field(..., examples=["John Doe"])
    role: str = Field(..., examples=["accounting"])


class PolicyCreate(BaseModel):
    title: str
    content: str
    version: str = "1.0"


class SignInRequest(BaseModel):
    employee_id: str
    policy_id_to_acknowledge: Optional[int] = None


class SignOutRequest(BaseModel):
    employee_id: str


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
    return {"status": "success", "message": "Employee registered successfully", "data": employee}


@app.post("/api/admin/policies", status_code=status.HTTP_201_CREATED)
def publish_policy(policy: PolicyCreate, db: Session = Depends(get_db)):
    new_policy = PolicyModel(
        title=policy.title,
        content=policy.content,
        version=policy.version,
    )
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
        return {
            "status": "already_signed_in",
            "session_id": active_session.id,
            "sign_in_time": active_session.sign_in_time,
        }

    new_session = AttendanceModel(
        employee_id=payload.employee_id,
        sign_in_time=datetime.utcnow(),
        acknowledged_policy_id=payload.policy_id_to_acknowledge,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "status": "success",
        "message": f"Welcome back, {emp.full_name}.",
        "session_id": new_session.id,
        "sign_in_time": new_session.sign_in_time,
    }


@app.post("/api/workspace/sign-out")
def employee_sign_out(payload: SignOutRequest, db: Session = Depends(get_db)):
    active_session = (
        db.query(AttendanceModel)
        .filter(AttendanceModel.employee_id == payload.employee_id, AttendanceModel.sign_out_time.is_(None))
        .order_by(AttendanceModel.sign_in_time.desc())
        .first()
    )

    if not active_session:
        raise HTTPException(status_code=400, detail="No active sign-in session found for this ID.")

    active_session.sign_out_time = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "message": "Signed out successfully.",
        "sign_out_time": active_session.sign_out_time,
    }


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
