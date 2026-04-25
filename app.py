"# This initializes the Flask app and sets a basic homepage route."
from 
flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return "Welcome to GreenACC!"

if __name__ == '__main__':
    app.run(debug=True)
    
    "# This defines the User model and sets up the database."
That way, you'll know it’s about user storage!"

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

from flask import request, redirect, url_for, render_template
from flask_login import login_user, logout_user, login_required

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user and user.password == request.form['password']:
            login_user(user)
            return redirect(url_for('home'))
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))
    # Change directory into your codebase
cd /to/your/project

# o3-mini
aider --model o3-mini

# o1-mini
aider --model o1-mini

# GPT-4o
aider --model gpt-4o

# List models available from OpenAI
aider --list-models openai/

