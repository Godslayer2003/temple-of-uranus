import random

from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

joined_count = 0  # simple in-memory counter, resets on restart

RIDDLES = [
    {
        "question": "What walks on four legs in the morning, two legs at noon, and three legs in the evening?",
        "options": ["Man", "Lion", "Centaur", "The Minotaur"],
        "answer": "Man",
    },
    {
        "question": "The more you take, the more you leave behind. What am I?",
        "options": ["Footsteps", "Shadows", "Memories", "Time"],
        "answer": "Footsteps",
    },
    {
        "question": "I am not alive, but I grow; I have no lungs, but I need air; I have no mouth, but water kills me. What am I?",
        "options": ["Fire", "A river", "A storm", "A tree"],
        "answer": "Fire",
    },
    {
        "question": "What is so fragile that saying its name breaks it?",
        "options": ["Silence", "Glass", "Trust", "A promise"],
        "answer": "Silence",
    },
    {
        "question": "Two sisters are we: one gives birth to the other, and she in turn gives birth to the first. Who are we?",
        "options": ["Day and Night", "Sun and Moon", "Life and Death", "Fire and Ash"],
        "answer": "Day and Night",
    },
    {
        "question": "The one who makes it sells it. The one who buys it never uses it. The one who uses it never knows it. What is it?",
        "options": ["A coffin", "A gift", "A secret", "A prophecy"],
        "answer": "A coffin",
    },
]


@app.route("/")
def home():
    thanks = request.args.get("thanks") == "1"
    return render_template("index.html", joined=joined_count, thanks=thanks)


@app.route("/join", methods=["POST"])
def join():
    global joined_count
    joined_count += 1
    return redirect(url_for("home", thanks=1))


@app.route("/trial")
def trial():
    riddle_id = random.randrange(len(RIDDLES))
    riddle = RIDDLES[riddle_id]
    return render_template(
        "trial.html", riddle=riddle["question"], options=riddle["options"], riddle_id=riddle_id
    )


@app.route("/trial/answer", methods=["POST"])
def trial_answer():
    chosen = request.form.get("answer", "")
    try:
        riddle_id = int(request.form.get("riddle_id", -1))
        correct_answer = RIDDLES[riddle_id]["answer"]
    except (ValueError, IndexError):
        return redirect(url_for("underworld"))
    if chosen.strip().lower() == correct_answer.lower():
        return redirect(url_for("olympus"))
    return redirect(url_for("underworld"))


@app.route("/olympus")
def olympus():
    return render_template("olympus.html")


@app.route("/underworld")
def underworld():
    return render_template("underworld.html")


if __name__ == "__main__":
    app.run(debug=True)
