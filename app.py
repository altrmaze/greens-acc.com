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
app.config["SECRET_KEY"] = "dev-key-123" # In production, use a secure random key
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
    invoice_type = db.Column(db.String(50), default="invoice")
    description = db.Column(db.Text, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default="unpaid")
    created_at = db.Column(db.DateTime, default=datetime.now)
    customer = db.relationship("Customer")

class Payroll(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_name = db.Column(db.String(200), nullable=False)
    salary = db.Column(db.Float, nullable=False)
    bonus = db.Column(db.Float, default=0)
    deduction = db.Column(db.Float, default=0)
    month = db.Column(db.String(50), nullable=False)

# ============================================================
# 3) HELPERS & PERMISSIONS
# ============================================================

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

def permission_required(*roles):
    def wrapper(func):
        @wraps(func)
        def decorated_view(*args, **kwargs):
            if not current_user.is_authenticated or current_user.role not in roles:
                flash("Access Denied: Insufficient Permissions.")
                return redirect(url_for("dashboard"))
            return func(*args, **kwargs)
        return decorated_view
    return wrapper

# Standard HTML Wrapper
def page(content_template, **kwargs):
    BASE_HTML = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>GreenACC | Accounting</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: #f0f2f5; color: #333; }
            .nav { background: #1b5e20; color: white; padding: 1rem 2rem; display: flex; gap: 20px; align-items: center; }
            .nav a { color: #e8f5e9; text-decoration: none; font-weight: 500; font-size: 0.9rem; }
            .nav a:hover { color: white; border-bottom: 2px solid #81c784; }
            .container { max-width: 1100px; margin: 2rem auto; padding: 0 20px; }
            .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 25px; }
            .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
            .stat-card { background: #fff; padding: 20px; border-left: 5px solid #2e7d32; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
            input, textarea, select { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
            button { background: #2e7d32; color: white; padding: 12px 24px; border: 0; border-radius: 6px; cursor: pointer; font-weight: bold; }
            button:hover { background: #1b5e20; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
            th { background: #f8f9fa; color: #667; text-transform: uppercase; font-size: 0.8rem; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
            .paid { background: #c8e6c9; color: #2e7d32; }
            .unpaid { background: #ffcdd2; color: #c62828; }
            @media print { .nav, .no-print, button { display: none !important; } .card { box-shadow: none; border: 1px solid #eee; } }
        </style>
    </head>
    <body>
        <div class="nav">
            <strong style="font-size: 1.2rem; margin-right: 20px;">GreenACC</strong>
            {% if current_user.is_authenticated %}
                <a href="{{ url_for('dashboard') }}">Dashboard</a>
                <a href="{{ url_for('customers') }}">Customers</a>
                <a href="{{ url_for('invoices') }}">Invoices</a>
                <a href="{{ url_for('quotations') }}">Quotations</a>
                {% if current_user.role in ['admin', 'accountant'] %}
                    <a href="{{ url_for('payroll') }}">Payroll</a>
                {% endif %}
                {% if current_user.role == 'admin' %}
                    <a href="{{ url_for('users') }}">Users</a>
                {% endif %}
                <span style="flex-grow: 1;"></span>
                <span style="font-size: 0.8rem;">Logged in as: {{ current_user.username }}</span>
                <a href="{{ url_for('logout') }}" style="color: #ffcdd2;">Logout</a>
            {% else %}
                <a href="{{ url_for('login') }}">Login</a>
            {% endif %}
        </div>
        <div class="container">
            {% with messages = get_flashed_messages() %}
                {% if messages %}
                    {% for message in messages %}
                        <div class="card" style="border-left: 5px solid #d32f2f; padding: 15px;">{{ message }}</div>
                    {% endfor %}
                {% endif %}
            {% endwith %}
            {{ content|safe }}
        </div>
    </body>
    </html>
    """
    # Merge current_user into kwargs for render_template_string
    return render_template_string(BASE_HTML, content=render_template_string(content_template, **kwargs), current_user=current_user)

# ============================================================
# 4) ROUTES (Login, Dashboard, Core Logic)
# ============================================================

@app.route("/")
def home():
    return redirect(url_for("dashboard"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = User.query.filter_by(username=request.form["username"]).first()
        if user and user.password == request.form["password"]:
            login_user(user)
            return redirect(url_for("dashboard"))
        flash("Invalid credentials.")
    return page("""
    <div class="card" style="max-width: 400px; margin: 100px auto;">
        <h2 style="text-align: center; color: #1b5e20;">Login to GreenACC</h2>
        <form method="POST">
            <label>Username</label><input name="username" required>
            <label>Password</label><input name="password" type="password" required>
            <button style="width: 100%; margin-top: 10px;">Sign In</button>
        </form>
    </div>
    """)

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))

@app.route("/dashboard")
@login_required
def dashboard():
    stats = {
        "customers": Customer.query.count(),
        "invoices": Invoice.query.filter_by(invoice_type="invoice").count(),
        "quotations": Invoice.query.filter_by(invoice_type="quotation").count(),
        "sales": db.session.query(db.func.sum(Invoice.amount)).filter_by(invoice_type="invoice", status="paid").scalar() or 0
    }
    return page("""
    <h1>Dashboard Overview</h1>
    <div class="stat-grid">
        <div class="stat-card"><h3>{{ stats.customers }}</h3><p>Total Customers</p></div>
        <div class="stat-card"><h3>{{ stats.invoices }}</h3><p>Active Invoices</p></div>
        <div class="stat-card"><h3>{{ stats.quotations }}</h3><p>Quotations</p></div>
        <div class="stat-card" style="border-left-color: #ffd600;"><h3>${{ "{:,.2f}".format(stats.sales) }}</h3><p>Total Paid Sales</p></div>
    </div>
    <div class="card" style="margin-top: 30px;">
        <h3>Quick Actions</h3>
        <a href="{{ url_for('invoices') }}"><button>Create New Invoice</button></a>
        <a href="{{ url_for('customers') }}"><button style="background: #455a64;">Manage Customers</button></a>
    </div>
    """, stats=stats)

# --- Remaining routes (Customers, Invoices, etc.) use the provided logic ---
# (Keep your existing route decorators and SQL logic from the original prompt)

@app.route("/customers", methods=["GET", "POST"])
@login_required
@permission_required("admin", "accountant", "sales")
def customers():
    if request.method == "POST":
        c = Customer(name=request.form["name"], phone=request.form["phone"], 
                     email=request.form["email"], address=request.form["address"])
        db.session.add(c)
        db.session.commit()
        return redirect(url_for("customers"))
    
    customers_list = Customer.query.all()
    return page("""
    <h2>Customer Directory</h2>
    <div class="card">
        <form method="POST">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input name="name" placeholder="Full Name" required>
                <input name="phone" placeholder="Phone Number">
                <input name="email" placeholder="Email Address">
                <input name="address" placeholder="Physical Address">
            </div>
            <button type="submit">Register Customer</button>
        </form>
    </div>
    <table>
        <thead><tr><th>ID</th><th>Name</th><th>Contact</th><th>Email</th></tr></thead>
        {% for c in customers_list %}
        <tr><td>#{{ c.id }}</td><td><b>{{ c.name }}</b></td><td>{{ c.phone }}</td><td>{{ c.email }}</td></tr>
        {% endfor %}
    </table>
    """, customers_list=customers_list)

@app.route("/invoices", methods=["GET", "POST"])
@login_required
@permission_required("admin", "accountant", "sales")
def invoices():
    if request.method == "POST":
        inv = Invoice(customer_id=request.form["customer_id"], description=request.form["description"],
                      amount=float(request.form["amount"]), status=request.form["status"], invoice_type="invoice")
        db.session.add(inv)
        db.session.commit()
        return redirect(url_for("invoices"))
    
    customers_list = Customer.query.all()
    invoices_list = Invoice.query.filter_by(invoice_type="invoice").all()
    return page("""
    <h2>Sales Invoices</h2>
    <div class="card">
        <form method="POST">
            <select name="customer_id" required>
                <option value="">-- Select Customer --</option>
                {% for c in customers %} <option value="{{ c.id }}">{{ c.name }}</option> {% endfor %}
            </select>
            <input name="description" placeholder="Item/Service Description" required>
            <input name="amount" type="number" step="0.01" placeholder="Total Amount" required>
            <select name="status">
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
            </select>
            <button>Generate Invoice</button>
        </form>
    </div>
    <table>
        <tr><th>Inv #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Action</th></tr>
        {% for i in invoices %}
        <tr>
            <td>INV-{{ i.id }}</td>
            <td>{{ i.customer.name }}</td>
            <td>${{ "{:,.2f}".format(i.amount) }}</td>
            <td><span class="badge {{ i.status }}">{{ i.status|upper }}</span></td>
            <td><a href="{{ url_for('print_invoice', invoice_id=i.id) }}">View/Print</a></td>
        </tr>
        {% endfor %}
    </table>
    """, customers=customers_list, invoices=invoices_list)

# (Add similar implementations for Quotations, Payroll, and Users based on your models)

@app.route("/print/<int:invoice_id>")
@login_required
def print_invoice(invoice_id):
    invoice = db.session.get(Invoice, invoice_id)
    return page("""
    <div class="card" style="border: 2px solid #eee; padding: 50px;">
        <div style="display: flex; justify-content: space-between;">
            <div><h1 style="color: #2e7d32; margin: 0;">GreenACC</h1><p>Financial Solutions Inc.</p></div>
            <div style="text-align: right;">
                <h2 style="margin: 0;">{{ invoice.invoice_type|upper }}</h2>
                <p>#{{ invoice.id }}<br>Date: {{ invoice.created_at.strftime('%d %b %Y') }}</p>
            </div>
        </div>
        <hr>
        <div style="margin: 40px 0;">
            <h4>BILL TO:</h4>
            <strong>{{ invoice.customer.name }}</strong><br>
            {{ invoice.customer.address }}<br>
            {{ invoice.customer.phone }}
        </div>
        <table style="margin-bottom: 40px;">
            <tr style="background: #f4f4f4;"><th>Description</th><th style="text-align: right;">Total</th></tr>
            <tr><td>{{ invoice.description }}</td><td style="text-align: right;">${{ "{:,.2f}".format(invoice.amount) }}</td></tr>
        </table>
        <div style="text-align: right;">
            <h3>Total Amount: ${{ "{:,.2f}".format(invoice.amount) }}</h3>
            <p>Status: <strong>{{ invoice.status|upper }}</strong></p>
        </div>
        <button class="no-print" onclick="window.print()" style="margin-top: 20px;">Print Document</button>
    </div>
    """, invoice=invoice)

# ============================================================
# 5) INITIALIZATION
# ============================================================

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(username="admin").first():
            db.session.add(User(username="admin", password="admin123", role="admin"))
            db.session.commit()
    app.run(debug=True)
    pip install flask flask-sqlalchemy flask-login

