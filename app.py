# ============================================================
# GreenACC V1 - Full single-file Flask accounting system
# Features:
# Login, Admin/User permissions, Customers, Invoices,
# Quotations, Payroll, Dashboard, Print Invoice, SQLite database
# ============================================================

from flask import Flask, request, redirect, url_for, render_template_string, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    UserMixin, LoginManager, login_user,
    logout_user, login_required, current_user
)
from functools import wraps
from datetime import datetime

# ============================================================
# 1) APP SETUP
# ============================================================

app = Flask(__name__)
app.config["SECRET_KEY"] = "change-this-secret-key"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///greenacc.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"


# ============================================================
# 2) DATABASE TABLES
# ============================================================

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(50), default="staff")


class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(100))
    email = db.Column(db.String(150))
    address = db.Column(db.Text)
    notes = db.Column(db.Text)


class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id"))
    invoice_type = db.Column(db.String(50), default="invoice")  # invoice or quotation
    description = db.Column(db.Text, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default="unpaid")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    customer = db.relationship("Customer")


class Payroll(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_name = db.Column(db.String(200), nullable=False)
    salary = db.Column(db.Float, nullable=False)
    bonus = db.Column(db.Float, default=0)
    deduction = db.Column(db.Float, default=0)
    month = db.Column(db.String(50), nullable=False)


# ============================================================
# 3) LOGIN LOADER
# ============================================================

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ============================================================
# 4) PERMISSION SYSTEM
# ============================================================

def permission_required(*roles):
    def wrapper(func):
        @wraps
