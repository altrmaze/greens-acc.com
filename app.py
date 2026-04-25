import os
from flask import Flask, render_template, request, redirect, url_for, flash, abort
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin, LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# --- INITIALIZATION ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-super-secret-key-change-this' # Change this for production
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///greenacc_v1.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# --- MODELS & DATABASE ---

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='employee')  # 'admin' or 'employee'

    def is_admin(self):
        return self.role == 'admin'

class Transaction(db.Model):
    """Accounting Table for Trading, Real Estate, and Cars"""
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False) # e.g., 'Car', 'Real Estate', 'Trading'
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(10)) # 'Income' or 'Expense'
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))

# --- AUTHENTICATION HELPERS ---

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def admin_required(f):
    """Decorator to restrict access to Admins only"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            flash("Permission Denied: Admin access required.", "danger")
            return abort(403)
        return f(*args, **kwargs)
    return decorated_function

# --- ROUTES ---

@app.route('/')
def home():
    return render_template('index.html', title="Home")

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password, password):
            login_user(user)
            flash(f"Welcome back, {username}!", "success")
            return redirect(url_for('dashboard'))
        else:
            flash("Invalid credentials. Please try again.", "danger")
    return render_template('login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    transactions = Transaction.query.all()
    return render_template('dashboard.html', transactions=transactions)

@app.route('/add_entry', methods=['GET', 'POST'])
@login_required
def add_entry():
    if request.method == 'POST':
        new_tx = Transaction(
            category=request.form.get('category'),
            description=request.form.get('description'),
            amount=float(request.form.get('amount')),
            type=request.form.get('type'),
            created_by=current_user.id
        )
        db.session.add(new_tx)
        db.session.commit()
        flash("Entry added successfully!", "success")
        return redirect(url_for('dashboard'))
    return render_template('add_entry.html')

@app.route('/delete/<int:id>')
@admin_required # Only admins can delete records
def delete_entry(id):
    entry = Transaction.query.get_or_404(id)
    db.session.delete(entry)
    db.session.commit()
    flash("Record deleted.", "info")
    return redirect(url_for('dashboard'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

# --- INITIALIZE DATABASE & ADMIN USER ---
def init_db():
    with app.app_context():
        db.create_all()
        # Create a default admin if none exists
        if not User.query.filter_by(username='admin').first():
            hashed_pw = generate_password_hash('AdminPass123!', method='pbkdf2:sha256')
            admin = User(username='admin', password=hashed_pw, role='admin')
            db.session.add(admin)
            db.session.commit()
            print("Database initialized with admin account.")

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
