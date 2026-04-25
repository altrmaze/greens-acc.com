"# This initializes the Flask app and sets a basic homepage route."
from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return "Welcome to GreenACC!"

if __name__ == '__main__':
    app.run(debug=True)
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin, LoginManager

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
db = SQLAlchemy(app)

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)

db.create_all()
from flask_login import LoginManager, login_user, logout_user, login_required

login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
